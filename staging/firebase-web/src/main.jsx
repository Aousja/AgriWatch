const staged = import.meta.env.MODE === 'staging'
  && import.meta.env.VITE_STAGED_FIREBASE_AUTH === 'true'
  && window.location.pathname === '/staged-sign-in';
if (staged) {
  import('./staged/entry.jsx').catch(() => {
    document.getElementById('root').textContent = 'The staging preview could not start. Check the staging configuration.';
  });
} else {
  import('./legacy-main.jsx');
}
