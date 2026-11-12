'use client';

import { useEffect } from 'react';

// PT Distinction client portal embed. portal.js reads the global `ptd_param`
// and renders the login / member area into <div id="ptd_portal">. We inject it
// from an effect (after the div exists) and re-add it on each mount so the
// portal re-initializes when someone navigates back to this page.
const APK = 'CEP794NSTK1741443';
const DOMAIN = 'https://v3portal.ptdistinction.com';
const PORTAL_JS = 'https://v3portal.ptdistinction.com/v3/inside/integration/v1/portal.js';

export default function ClientPortal() {
  useEffect(() => {
    (window as unknown as { ptd_param: Record<string, string> }).ptd_param = { apk: APK, domain: DOMAIN };

    // Drop any prior instance so a revisit starts clean, then load fresh.
    document.querySelectorAll('script[data-ptd-portal]').forEach((el) => el.remove());
    const s = document.createElement('script');
    s.src = PORTAL_JS;
    s.async = true;
    s.setAttribute('data-ptd-portal', '');
    document.body.appendChild(s);

    return () => { s.remove(); };
  }, []);

  return <div id="ptd_portal" />;
}
