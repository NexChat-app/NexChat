// Marketplace UI polish only. Keeps the existing business logic untouched.
(function () {
  const apply = () => {
    const sell = document.getElementById("btn-my-shop");
    const buy = document.getElementById("btn-my-orders");

    if (sell) {
      sell.textContent = "Vendre";
      sell.setAttribute("aria-label", "Vendre sur NexChat");
    }
    if (buy) {
      buy.textContent = "Acheter";
      buy.setAttribute("aria-label", "Acheter sur NexChat");
    }
  };

  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
  apply();
})();
