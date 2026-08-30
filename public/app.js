const form = document.getElementById("messageForm");
const submitBtn = document.getElementById("submitBtn");
const success = document.getElementById("success");
const anotherBtn = document.getElementById("anotherBtn");
const toast = document.getElementById("toast");

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = {
    senderName: document.getElementById("senderName").value.trim(),
    recipientName: document.getElementById("recipientName").value.trim(),
    message: document.getElementById("message").value.trim()
  };

  if (!data.senderName || !data.recipientName || !data.message) {
    showToast("Please fill in all the little boxes 💗");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector("span").textContent = "Sending the feelings...";

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Something went wrong.");

    form.reset();
    form.closest(".card").classList.add("hidden");
    success.classList.remove("hidden");
    window.scrollTo({ top: success.offsetTop - 30, behavior: "smooth" });
  } catch (error) {
    showToast("Oops! The feelings got stuck in traffic. Try again. 🥲");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector("span").textContent = "Send the little letter";
  }
});

anotherBtn.addEventListener("click", () => {
  success.classList.add("hidden");
  form.closest(".card").classList.remove("hidden");
  document.getElementById("senderName").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});