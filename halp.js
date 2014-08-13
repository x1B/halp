/**
 * @license Hypertext Application Language Processor (HALP)
 * (c) 2014 Michael Kurze, http://github.com/x1b/halp
 * License: MIT
 */
define( [ 'uri-templates' ], function( uriTemplates, undefined ) {

   var RESERVED = { '_links': true, '_embedded': true };

   return halp;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Instantiate a HAL processor by passing dependencies
    *
    * Each HAL processor instantiated in this manner will have its own cache universe within which (embedded)
    * resources are shared when traversing links.
    *
    * @param {object} q
    *    A promise implementation compatible with AngularJS $q
    * @param {object} http
    *    An HTTP client implementation which offers a `get` method compatible with AngularJS $http
    * @param {object} [options]
    *    An optional object with further configuration properties
    * @param {object} [options.protect]
    *    A protection function used to transform any (parts of) resources that are passed out to clients.
    *    Example behaviors compatible with HALP include freezing, cloning or deep-cloning objects.
    *    By default, no additional protection is applied for maximum performance.
    *    This means that clients will witness mutual modifications to the same resource's properties.
    * @param {object} [options.log]
    *    A logger compatible with the console.log provided by modern browsers.
    *    If no implementation is given, console.log is used.
    *
    * @returns {{link: link, resource: resource}}
    *    a hal factory that allows to create links and resources
    */
   function halp( q, http, options ) {
      options = options || {};
      var protect = options.protect || identity;
      var log = options.log || window.console;

      var resourceCache = {};

      return {
         link: link,
         resource: resource
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create a traversable link from a link representation
       *
       * @param {string|object} link
       *    A link representation, being either
       *    - a string, which is interpreted as a uri
       *    - a hal-link with at least the `href` attribute set
       * @param {string} link.href
       *    when passing a hal-link, its mandatory href attribute
       * @param {boolean} [link.templated]
       *    indicates that this link has template parameters
       * @param {boolean} [link.name]
       *    a name which allows to identify a link within a relation
       *
       * @returns {{fetch: Function, instantiate: Function, href: string}}
       *    A superset of the hal-link structure with the additional methods instantiate and fetch.
       */
      function link( link ) {
         link = link.href ? link : { href: link };
         var href = link.href;

         /**
          * Fetch a representation of the resource associated with this link.
          *
          * @param {boolean} [options.revalidate]
          * @param {object} [options.parameters]
          */
         function fetch( options ) {
            options = options || {};
            var revalidate = options.revalidate;
            if( !revalidate && resourceCache[ href ] ) {
               return q.when( resourceCache[ href ] );
            }

            return http.get( href, {} ).then(
               function( response ) {
                  var hal = response.data;
                  var res = resource( hal );
                  cachePut( res, href );
                  return res;
               },
               function( response ) {
                  log.warn( 'GET failed for %s (status: %s)', href, response.status );
                  return response;
               }
            );
         }

         var template;
         if( link.templated ) {
            uriTemplates( link.href );
         }

         /**
          * Instantiate a templated link into a non-templated link by substituting the template parameters
          *
          * @param {object} parameters The template parameters to fill in
          *
          * @returns {link}
          */
         function instantiate( parameters ) {
            return template ? template.fillFromObject( parameters ) : link.href;
         }

         return {
            fetch: fetch,
            instantiate: instantiate,
            href: href
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      /**
       * Create a traversable hypermedia resource representation from
       * @param hal
       * @returns {{hal: hal, properties: properties, link: link, links: links, follow: follow, followEach: followEach, followAll: followAll}}
       */
      function resource( hal ) {

         // links by normalized relation:
         var _links = {};
         var _nameCache = null;
         Object.keys( hal._links || {}  ).forEach( function( relation ) {
            _links[ normRel( relation ) ] = hal._links[ relation ];
            // :TODO: create+fill name-cache
         } );

         var _curieByPrefix = null;
         if( _links.curies ) {
            _curieByPrefix = {};
            _links.curies.forEach( function( curie ) {
               _curieByPrefix[ curie.name ] = link( curie );
            } );
         }

         // embedded resources by normalized relation:
         var _embedded = {};
         Object.keys( hal._embedded || {} ).forEach( function( relation, related ) {
            var rel = normRel( relation );
            _embedded[ rel ] = related;
            array( _embedded[ rel] ).forEach( function( hal ) {
               cachePut( resource( hal ) );
            } );
         } );


         /** @return {String} the normalized name (uri) of the given relation */
         function normRel( relation ) {
            if( _curieByPrefix ) {
               return resolveCurie( relation );
            }
            return relation;
         }

         function resolveCurie( maybeCurie ) {
            var splitPos = maybeCurie.indexOf( ':' );
            var prefix = splitPos === -1 ? maybeCurie : maybeCurie.substring( 0, splitPos );
            var curieLink = _curieByPrefix[ prefix ];
            if( !curieLink ) {
               return maybeCurie;
            }

            var rel = maybeCurie.substring( splitPos + 1 );
            return curieLink.instantiate( { rel: rel } );
         }

         /** @return {Object} an absolute link to a related resource */
         function link( relation ) {
            return absoluteLink( _links[ normRel( relation ) ] );
         }

         /**
          * @param {String} relation
          * @return {Array|Object} a list of links (in the given relation), or all links overall (no relation)
          */
         function links( relation ) {
            if( relation === undefined ) {
               return _links;
            }
            relation = normRel( relation );
            return _links[ relation ].map( function( link ) {
               return absoluteLink( link );
            } );
         }

         /**
          * @param {String} relation
          * @param {String=} options.name
          *
          * @return {Object} a promise to the related resource
          */
         function follow( relation, options ) {
            var rel = normRel( relation );
            var link;
            if( options.name ) {
               link = _nameCache[ rel ][ options.name ];
               if( link ) {
                  return link( relation ).filter( function( _ ) { return _.name === options.name; } );
               }
               return q.reject();
            }
            return link( relation ).fetch();
         }

         /** @return {Array} a list of promises, each to a related resource */
         function followEach( relation ) {
            return links( relation ).map( function( link ) {
               return link.fetch();
            } );
         }

         /** @return {Object} a promise to a list of related resources */
         function followAll( relation ) {
            return q.all( followEach( relation ) );
         }

         return {
            hal: function() {
               return protect( hal );
            },

            properties: function() {
               var properties = {};
               Object.keys( hal ).forEach( function( key ) {
                  if( !( key in RESERVED ) ) {
                     properties[ key ] = protect( hal[ key ] );
                  }
               } );
               return properties;
            },

            link: link,
            links: links,

            follow: follow,
            followEach: followEach,
            followAll: followAll
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function cachePut( resource, href ) {
         if( href ) {
            resourceCache[ href ] = resource;
         }
         var selfLink = resource.link( 'self' );
         if( selfLink && selfLink.href ) {
            resourceCache[ href ] = resource;
         }
      }

   }

   function identity( _ ) { return _; }

   function array( _ ) {  return Array.isArray( _ ) ? _ : [ _ ]; }

} );
