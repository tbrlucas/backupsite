(() => {
  const now = new Date();
  const hour = now.getHours();

  let theme;
  let greeting;

  if (hour >= 6 && hour < 12) {
    theme = "morning";
    greeting = "good morning";
  } else if (hour >= 12 && hour < 18) {
    theme = "afternoon";
    greeting = "good afternoon";
  } else {
    theme = "night";
    greeting = "good night";
  }

  document.body.dataset.theme = theme;
  document.title = `tbrlucas :: ${greeting}`;

  const year = document.getElementById("year");
  if (year) year.textContent = String(now.getFullYear());
})();
