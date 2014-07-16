define( [ 'uri-templates' ], function( uriTemplates, undefined ) {

   var RESERVED = {
      '_links': true,
      '_embedded': true
   };

   return halp;

   function halp( q, http, options ) {
      options = options || {};


      var protect = options.protect || identity;
      var log = options.log || window.console;

      var resourceCache = {};

      return {
         link: absoluteLink,
         resource: resource
      };

      function absoluteLink( link ) {
         link = link.href ? link : { href: link };
         var href = link.href;

         /**
          * @param {Boolean=false} options.revalidate
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
                  put( res, href );
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

         function instantiate( parameters ) {
            return template ? template.fillFromObject( parameters ) : link.href;
         }

         return {
            fetch: fetch,
            instantiate: instantiate,
            href: href
         }
      }


      function resource( hal ) {

         // links by normalized relation:
         var _links = {};
         Object.keys( hal._links || {}  ).forEach( function( relation ) {
            _links[ normRel( relation ) ] = hal._links[ relation ];
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
               put( resource( hal ) );
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
         function link( relation, options ) {
            return absoluteLink( _links[ normRel( relation ) ] );
         }

         /**
          * @param {String} relation
          * @return {Object} all links (in the given relation)
          */
         function links( relation ) {
            if( relation === undefined ) {
               return _links;
            }
            relation = rel( relation );
            return hal._links[ relation ].map( function() {
               var uri = '...';
               // ...
               return absoluteLink( { uri: uri } );
            } );
         }

         /**
          * @param {String} relation
          * @param {String=} options.name
          *
          * @return {Object} a promise to the related resource
          */
         function follow( relation, options ) {
            return link( relation, options ).fetch();
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

            properties: function( options ) {
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


      function put( resource, href ) {
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
