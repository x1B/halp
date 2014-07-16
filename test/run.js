require.config( {
   baseUrl: '../',
   paths: {
      // deps
      'angular': 'bower_components/angular/angular',
      'uri-templates': 'bower_components/uri-templates/uri-templates',

      // testing
      'text': 'bower_components/requirejs-plugins/lib/text',
      'json': 'bower_components/requirejs-plugins/src/json',
      'angular-mocks': 'bower_components/angular-mocks/angular-mocks',
      'jasmine': 'bower_components/jasmine/lib/jasmine-core/jasmine',
      'jasmine-html': 'bower_components/jasmine/lib/jasmine-core/jasmine-html',
      'boot': 'bower_components/jasmine/lib/jasmine-core/boot',
      'spec': 'test/spec',
      'mockQ': 'bower_components/mockQ/q',

      // halp
      'halp': 'halp'
   },
   shim: {
      'jasmine': {
         exports: 'window.jasmineRequire'
      },
      'jasmine-html': {
         deps: ['jasmine'],
         exports: 'window.jasmineRequire'
      },
      'boot': {
         deps: ['jasmine', 'jasmine-html'],
         exports: 'window.jasmineRequire'
      }
   }
} );


require( [ 'boot', 'json!spec/index.json' ], function( jasmine, index ) {

   function prefix( spec ) {
      return 'spec/' + spec;
   }

   require( index.specs.map( prefix ), function() {
      window.onload();
   } );

} );
