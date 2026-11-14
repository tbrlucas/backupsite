(() => {
  const hour = new Date().getHours();
  const greeting = hour >= 6 && hour < 12 ? "good morning" : hour >= 12 && hour < 18 ? "good afternoon" : "good night";
  document.title = `tbrlucas :: ${greeting}`;
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
