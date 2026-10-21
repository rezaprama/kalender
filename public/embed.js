/*! Kalender Indonesia embed: <kalender-indonesia year="2026" month="8" lang="id" theme="auto" mode="jawa"></kalender-indonesia>
 * Apache-2.0. Calendar by Reza Prama Arviandi, https://rezaprama.com */
(function () {
  'use strict';
  var script = document.currentScript;
  var ORIGIN = new URL(script && script.src ? script.src : 'https://kalender.rezaprama.com/embed.js').origin;
  var ATTRS = ['year', 'month', 'lang', 'theme', 'mode'];

  function src(el) {
    var params = new URLSearchParams();
    ATTRS.forEach(function (name) {
      var value = el.getAttribute(name);
      if (value) params.set(name, value);
    });
    return ORIGIN + '/embed?' + params.toString();
  }

  var Base = typeof HTMLElement === 'undefined' ? function () {} : HTMLElement;
  class KalenderIndonesia extends Base {
    static get observedAttributes() { return ATTRS; }
    connectedCallback() { this.update(); }
    attributeChangedCallback() { if (this.isConnected) this.update(); }
    update() {
      var frame = this.querySelector('iframe[data-kalender]');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.setAttribute('data-kalender', '');
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        frame.style.cssText = 'display:block;width:100%;max-width:480px;height:620px;border:0;color-scheme:normal';
        this.insertBefore(frame, this.firstChild);
      }
      frame.title = this.getAttribute('label') || (this.getAttribute('lang') === 'en' ? 'Indonesia calendar' : 'Kalender Indonesia');
      var next = src(this);
      if (frame.src !== next) frame.src = next;
    }
  }

  // The embedded page reports its height; only messages from our origin and our own frames are accepted.
  window.addEventListener('message', function (event) {
    if (event.origin !== ORIGIN || !event.data || event.data.type !== 'kalender:height') return;
    var height = Math.min(2000, Math.max(200, Number(event.data.height) || 0));
    document.querySelectorAll('kalender-indonesia iframe[data-kalender]').forEach(function (frame) {
      if (frame.contentWindow === event.source) frame.style.height = height + 'px';
    });
  });

  if (window.customElements && !customElements.get('kalender-indonesia')) customElements.define('kalender-indonesia', KalenderIndonesia);
})();
