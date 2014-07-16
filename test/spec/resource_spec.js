define( [ 'angular', 'angular-mocks', 'mockQ', 'halp', 'jasmine' ], function( ng, _, mockQ, halp, jasmine ) {
   'use strict';

   // Examples are from the RFC: http://tools.ietf.org/html/draft-kelly-json-hal-06
   var exampleOrders = {
      "_links": {
         "self": { "href": "/orders" },
         "next": { "href": "/orders?page=2" },
         "find": { "href": "/orders{?id}", "templated": true },
      },
      "_embedded": {
         "orders": [
            {
               "_links": {
                  "self": { "href": "/orders/123" },
                  "basket": { "href": "/baskets/98712" },
                  "customer": { "href": "/customers/7809" }
               },
               "total": 30.00,
               "currency": "USD",
               "status": "shipped"
            }, {
               "_links": {
                  "self": { "href": "/orders/124" },
                  "basket": { "href": "/baskets/97213" },
                  "customer": { "href": "/customers/12369" }
               },
               "total": 20.00,
               "currency": "USD",
               "status": "processing"
            }
         ]
      },
      "currentlyProcessing": 14,
      "shippedToday": 20
   };

   var exampleOrder = {
      "_links": {
         "self": { "href": "/orders/523" },
         "warehouse": { "href": "/warehouse/56" },
         "invoice": { "href": "/invoices/873" }
      },
      "currency": "USD",
      "status": "shipped",
      "total": 10.20
   };

   // Another custom example:
   var exampleMultiResults = {
      "_links": {
         "self": { "href": "/results" },
         "matches": [
            { "href": "/results/617-761", name: "X" },
            { "href": "http://example.com", name: "Z" },
            { "href": "http://example.com/XYZ", name: "Y" }
         ]
      },
      "results": [
         { "title": "interesting result from this server", "rank": 0, "match": "X" },
         { "title": "an example result", "rank": 20, "match": "Z" },
         { "title": "example XYZ -- another example", "rank": 27, "match": "Y" }
      ]
   };

   // Some shorthands:
   var exampleOrderLink = exampleOrder._links.self;
   var exampleEmbeddedOrder0 = exampleOrders._embedded.orders[ 0 ];
   var exampleEmbeddedOrder1 = exampleOrders._embedded.orders[ 1 ];


   describe( 'halp', function() {

      var hal;
      describe( 'without http', function() {
         var getSpy;
         beforeEach( function () {
            var $http = { 'get': function() {} };
            getSpy = spyOn( $http, 'get' );
            hal = halp( mockQ, $http );
         } );

         afterEach( function() {
            expect( getSpy ).not.toHaveBeenCalled();
         } );

         it( 'instantiates a link from a uri', function () {
            expect( hal.link( exampleOrderLink.href ).href ).toEqual( exampleOrderLink.href );
         } );

         it( 'instantiates a link from a hal-link representation', function () {
            expect( hal.link( exampleOrderLink ).href ).toEqual( exampleOrderLink.href );
         } );

         it( 'instantiates a resource from a hal-resource representation', function () {
            var order = hal.resource( exampleOrder );
            expect( order ).toBeDefined();
         } );

         it( 'allows to resolve links from resources', function () {
            var order = hal.resource( exampleOrder );
            expect( order.link( 'warehouse' ).href ).toEqual( exampleOrder._links.warehouse.href );
         } );

      } );

      describe( 'using http', function() {

         var $httpBackend, $http;
         beforeEach( inject( function($injector) {
            $httpBackend = $injector.get( '$httpBackend' );
            $httpBackend.when( 'GET', exampleOrder._links.self.href ).respond( exampleOrder );
            $httpBackend.when( 'GET', '/results/617-761' ).respond( {} );
            $http = $injector.get( '$http' );
         } ) );

         beforeEach( function () {
            hal = halp( mockQ, $http );
         } );

         it( 'allows to fetch resources from links', function() {
            var result = {};
            hal.link( exampleOrderLink ).fetch().then( function( res ) {
               result = res;
            } );
            $httpBackend.flush();
            expect( result.link( 'self' ).href ).toEqual(exampleOrderLink.href );
         } );

         it( 'allows to follow links from resources', function() {
            var result = {};
            var order = hal.resource( exampleOrder );
            order.follow( 'self' ).then( function( res ) {
               result = res;
            } );
            $httpBackend.flush();
            expect( result.link( 'self' ).href ).toEqual(exampleOrderLink.href );
         } );

         // :TBD:
         /*
         it( 'allows to qualify relations by name when following links', function() {
            var searchResults = hal.resource( exampleMultiResults );
            console.log( 'link', searchResults.link( 'matches', { name: 'X' } ) );

            var result = {};
            searchResults.follow( 'matches', { name: 'X' } ).then( function( res ) {
               result = res;
            } );
            $httpBackend.flush();
            expect( result.link( 'self' ).href ).toEqual( "/results/617-761" );
         } );
         */

      } )


   } );

} );
