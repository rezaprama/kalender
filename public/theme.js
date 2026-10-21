// Applies a saved or requested theme before first paint. Embeds may pass ?theme=light|dark.
(function () {
  try {
    var requested = new URLSearchParams(location.search).get('theme');
    var theme = requested === 'light' || requested === 'dark' ? requested : localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (error) { /* storage blocked: follow the system theme */ }
})();
