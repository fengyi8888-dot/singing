// 朗讀：只用瀏覽器內建的 speechSynthesis，不連外部服務。
export function speechText(str) {
  return String(str)
    .replace(/(\d+)又(\d+)\/(\d+)/g, '$1又$3分之$2')
    .replace(/(\d+)\/(\d+)/g, '$2分之$1')
    .replace(/(\d+(?:\.\d+)?)%/g, '百分之$1')
    .replace(/×/g, '乘以').replace(/÷/g, '除以').replace(/=/g, '等於')
    .replace(/(\d+)\s*:\s*(\d+)/g, '$1比$2')
    .replace(/°/g, '度');
}

export function canSpeak() { return typeof globalThis.speechSynthesis !== 'undefined'; }

export function speak(str) {
  if (!canSpeak()) return false;
  const synth = globalThis.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speechText(str));
  u.lang = 'zh-TW';
  const voice = synth.getVoices().find((v) => /zh[-_]TW/i.test(v.lang)) || synth.getVoices().find((v) => /^zh/i.test(v.lang));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  synth.speak(u);
  return true;
}

export function stopSpeaking() { if (canSpeak()) globalThis.speechSynthesis.cancel(); }
