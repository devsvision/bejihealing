import { initRouter, navigateTo } from "./router.js";
import { loadComponent, mountLayout, qs } from "./assets/js/core.js";
import { initAnimations } from "./assets/js/animation.js";
import { hydrateClock } from "./assets/js/helper.js";
import { appState } from "./assets/js/state.js";
import "./assets/js/auth.js";

async function boot() {
  await loadComponent("loading-root", "components/loading-screen.html");
  await mountLayout("main");
  initRouter();
  initAnimations();
  hydrateClock();

  window.navigateTo = navigateTo;
  window.appState = appState;

  setTimeout(() => qs("#loading-screen")?.classList.add("is-hidden"), 550);
}

boot().catch((error) => {
  console.error(error);
  document.querySelector("#app").innerHTML = `
    <main class="min-h-screen grid place-items-center p-6">
      <section class="glass-card max-w-xl p-8 text-center">
        <p class="text-gold text-sm uppercase tracking-[.35em]">System Notice</p>
        <h1 class="font-display text-3xl mt-3">The retreat interface could not load.</h1>
        <p class="text-white/60 mt-4">${error.message}</p>
      </section>
    </main>`;
});
