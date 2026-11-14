(() => {
  const now = new Date();

  const year = document.getElementById("year");
  if (year) year.textContent = String(now.getFullYear());

  if (window.jQuery && window.jQuery.fn.carousel) {
    const $carousel = window.jQuery("#deviceCarousel");
    if ($carousel.length) {
      $carousel.carousel({ interval: 6500, pause: "hover" });
    }
  }
})();
