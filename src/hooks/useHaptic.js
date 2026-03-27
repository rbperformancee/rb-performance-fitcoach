export function useHaptic() {
  const light = () => { try { navigator.vibrate && navigator.vibrate(10); } catch(e) {} };
  const medium = () => { try { navigator.vibrate && navigator.vibrate(30); } catch(e) {} };
  const heavy = () => { try { navigator.vibrate && navigator.vibrate([50,30,50]); } catch(e) {} };
  const success = () => { try { navigator.vibrate && navigator.vibrate([20,10,20,10,40]); } catch(e) {} };
  return { light, medium, heavy, success };
}
