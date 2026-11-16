// Runs before the first paint, ahead of the app's own scripts: the saved theme lives in the app's settings, which open
// only later, so without this a light theme would flash dark on every launch. src/store/theme.ts keeps the copy.
try {
  if (localStorage.getItem("moneyball-fm27:theme") === "light") document.documentElement.classList.remove("dark");
} catch {
  // storage blocked: the default dark theme stays until the settings load
}
