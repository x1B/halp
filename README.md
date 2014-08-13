_work in progress: this code is not ready for consumption_

# HALP!
## hypertext application language processor

HALP is a very basic [HAL WD6](http://tools.ietf.org/html/draft-kelly-json-hal-06) client with a focus on simple relation traversal and cache features.
It requires an AngularJS-$http compatible implementation of $http.get, such as that provided by [angular-etag](https://github.com/forforf/angular-etag).

### status

So far, there is no release!


### API

How it is supposed to work:
```js
define( [ 'halp' ], function( halp ) {
   var $q, $http = /* inject from somewhere */;
   var hal = halp( $q, $http, { base: 'http://service.example.com:8192' } );
   // ... work with hal instance ...
} );
```

From now on, a pre-configured hal interface is assumed to exist:
```js
var resource = hal.link( '/orders/523' ).fetch().then( function( resource ) {
   var self = resource.links( 'self' ).href;
   resource.follow( 'next' ).then( function( nextResource ) {
      // ...
   } );
} );
```
