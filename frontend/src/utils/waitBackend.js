// utils/waitBackend.js
export const waitBackend = async (url = 'http://localhost:3000/ping', timeout = 5000) => {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    
    if (Date.now() - start > timeout) {
      throw new Error('Backend not reachable');
    }
    await new Promise((res) => setTimeout(res, 100));
  }
};
