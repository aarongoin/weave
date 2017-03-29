// The following line loads the standalone build of Vue instead of the runtime-only build,
// so you don't have to do: import Vue from 'vue/dist/vue'
// This is done with the browser options. For the config, see package.json

// global css
require('./style.vue');

const 
	Vue = require('vue'),
	App = require('./App.vue');

new Vue({ // eslint-disable-line no-new
  el: '#app',
  render: function(h) { return h(App) }
})
