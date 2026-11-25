(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest('[data-print-doc]');
    if (btn) window.print();
  });
})();
