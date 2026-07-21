import { TalkingHead } from 'talkinghead';

const unlockAudioBtn = document.getElementById('unlockAudioBtn');
const askBtn = document.getElementById('askBtn');
const resetBtn = document.getElementById('resetBtn');
const promptInput = document.getElementById('prompt');
const statusNode = document.getElementById('status');
const responseText = document.getElementById('responseText');
const responseMood = document.getElementById('responseMood');
const responseGesture = document.getElementById('responseGesture');
const avatarContainer = document.getElementById('avatar');

let head = null;
let audioUnlocked = false;
let modelUrl = 'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@main/avatars/brunette.glb';
const defaultPrompt = 'Hello, please introduce yourself and say hello with a friendly gesture.';

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? '#b91c1c' : '#374151';
}

async function createTalkingHead() {
  if (!avatarContainer) return;

  head = new TalkingHead(avatarContainer, {
    avatarMood: 'neutral',
    lipsyncModules: ['en'],
    ttsEndpoint: '/api/tts',
    ttsLang: 'en-US',
    ttsVoice: 'en-US-Standard-B',
    avatarIdleEyeContact: 0.3,
    avatarIdleHeadMove: 0.35,
    avatarSpeakingEyeContact: 0.5,
    avatarSpeakingHeadMove: 0.6,
    mixerGainSpeech: 2
  });

  try {
    await head.showAvatar({
      url: modelUrl,
      avatarMood: 'neutral',
      lipsyncLang: 'en'
    }, (progress) => {
      setStatus(`Loading avatar ${Math.round(progress * 100)}%`);
    });
    setStatus('Julia is ready. Unlock audio to interact.');
  } catch (error) {
    console.error(error);
    setStatus('Unable to load avatar. Check the network or model URL.', true);
  }
}

async function unlockAudio() {
  if (audioUnlocked) return;

  try {
    const resumePromises = [];
    if (head?.audioCtx) {
      resumePromises.push(head.audioCtx.resume());
    }

    await Promise.all(resumePromises);
    audioUnlocked = true;
    askBtn.disabled = false;
    setStatus('Audio unlocked. You can now ask Julia questions.');
  } catch (error) {
    console.error(error);
    setStatus('Audio unlock failed. Please click again.', true);
  }
}

async function requestGemini(prompt) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reach Gemini proxy.');
  }

  return response.json();
}

function normalizeMood(mood) {
  const allowed = ['neutral', 'happy', 'sad', 'angry', 'fear', 'disgust', 'love', 'sleep'];
  return allowed.includes(mood) ? mood : 'neutral';
}

function normalizeGesture(gesture) {
  const allowed = ['none', 'handup', 'index', 'ok', 'thumbup', 'thumbdown', 'side', 'shrug', 'namaste'];
  return allowed.includes(gesture) ? gesture : 'none';
}

async function handleAsk() {
  if (!promptInput.value.trim()) {
    setStatus('Please enter a prompt first.', true);
    return;
  }
  if (!audioUnlocked) {
    setStatus('Please unlock audio before asking Julia.', true);
    return;
  }
  if (!head) {
    setStatus('Julia is not initialized yet.', true);
    return;
  }

  askBtn.disabled = true;
  setStatus('Thinking...');

  try {
    const { speechText, avatarMood, avatarGesture } = await requestGemini(promptInput.value.trim());
    responseText.textContent = speechText;
    responseMood.textContent = `Mood: ${avatarMood}`;
    responseGesture.textContent = `Gesture: ${avatarGesture}`;

    head.setMood(normalizeMood(avatarMood));
    if (avatarGesture !== 'none') {
      head.playGesture(normalizeGesture(avatarGesture), 3, false, 900);
    }

    head.speakText(speechText, {
      avatarMood: normalizeMood(avatarMood),
      lipsyncLang: 'en',
      ttsLang: 'en-US',
      ttsVoice: 'en-US-Standard-B'
    }, (subtitle) => {
      responseText.textContent = subtitle;
    });

    setStatus('Julia is responding...');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Error processing your request.', true);
  } finally {
    askBtn.disabled = false;
  }
}

function resetSession() {
  promptInput.value = '';
  responseText.textContent = 'No response yet.';
  responseMood.textContent = 'Mood: neutral';
  responseGesture.textContent = 'Gesture: none';
  setStatus(audioUnlocked ? 'Ready. Ask Julia anything.' : 'Audio is locked until you tap the unlock button.');
}

unlockAudioBtn.addEventListener('click', unlockAudio);
askBtn.addEventListener('click', handleAsk);
resetBtn.addEventListener('click', resetSession);

window.addEventListener('load', () => {
  setStatus('Preparing Julia...');
  createTalkingHead();
  promptInput.value = defaultPrompt;
});
