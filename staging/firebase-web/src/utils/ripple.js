// Attach as onMouseDown={addRipple} to any button with the .btn-animated
// class to get a material-style expanding ripple from the click point.
export function addRipple(e) {
  const button = e.currentTarget;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  const ripple = document.createElement("span");
  ripple.className = "btn-ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}
