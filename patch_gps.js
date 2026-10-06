const fs = require('fs');

const file = 'src/app/salesman/orders/create/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const originalHandleSubmit = `  const handleSubmitOrder = async (orderStatus: 'pending' | 'draft' = 'pending') => {
    if (!selectedParty) {
      setErrorMsg('Please select a chemist party first.');
      return;
    }
    if (cartItemsList.length === 0) {
      setErrorMsg('Please add at least one medicine to the order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {`;

const newHandleSubmit = `  const handleSubmitOrder = async (orderStatus: 'pending' | 'draft' = 'pending') => {
    if (!selectedParty) {
      setErrorMsg('Please select a chemist party first.');
      return;
    }
    if (cartItemsList.length === 0) {
      setErrorMsg('Please add at least one medicine to the order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Get GPS Location
    let gpsLat = null;
    let gpsLng = null;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      gpsLat = pos.coords.latitude;
      gpsLng = pos.coords.longitude;
    } catch(e) {
      console.warn("GPS tracking failed or denied", e);
    }

    try {`;

const originalFetch = `        body: JSON.stringify({
          partyId: selectedParty.id,
          status: orderStatus,
          remarks: remarks.trim() || undefined,
          items: cartItemsList,
        }),`;

const newFetch = `        body: JSON.stringify({
          partyId: selectedParty.id,
          status: orderStatus,
          remarks: remarks.trim() || undefined,
          items: cartItemsList,
          locationLat: gpsLat,
          locationLng: gpsLng,
        }),`;

code = code.replace(originalHandleSubmit, newHandleSubmit);
code = code.replace(originalFetch, newFetch);
fs.writeFileSync(file, code);
