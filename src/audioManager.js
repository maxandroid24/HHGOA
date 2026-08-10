// Audio Manager for HH Goa 2026
// Handles random celebration music playback on photo upload with mute persistence

const HYPE_TRACKS = [
  {
    id: 'cheema-y-snake',
    title: 'Snake',
    artist: 'Cheema Y',
    tag: 'Banger Drop 🔥',
    src: '/audio/cheema-y-snake_VeyAFnAz.mp3'
  },
  {
    id: 'guru-randhawa-fine-shyt',
    title: 'Fine Shyt',
    artist: 'Guru Randhawa',
    tag: 'Desi Swag ✨',
    src: '/audio/guru-randhawa-fine-shyt_ZOCp4JMH.mp3'
  },
  {
    id: 'ram-sampath-bhaag-dk-bose',
    title: 'Bhaag D.K. Bose',
    artist: 'Ram Sampath',
    tag: 'Speed Run 🚀',
    src: '/audio/ram-sampath-bhaag-dk-bose-aandhi-aayi_Dl2z2s54.mp3'
  },
  {
    id: 'yo-yo-honey-singh-millionaire',
    title: 'Millionaire',
    artist: 'Yo Yo Honey Singh',
    tag: 'Web3 Hustle 💰',
    src: '/audio/yo-yo-honey-singh-millionaire_kTUeS5MZ.mp3'
  }
];

let currentAudio = null;
let isPlaying = false;
let isMuted = localStorage.getItem('hhgoa_sound_muted') === 'true';
let playEndTimeout = null;

export function getMuteState() {
  return isMuted;
}

export function setMuteState(muted) {
  isMuted = muted;
  localStorage.setItem('hhgoa_sound_muted', isMuted ? 'true' : 'false');
  if (isMuted) {
    stopCurrentTrack();
  }
  return isMuted;
}

export function toggleMute() {
  return setMuteState(!isMuted);
}

export function stopCurrentTrack() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }

  if (playEndTimeout) {
    clearTimeout(playEndTimeout);
    playEndTimeout = null;
  }

  isPlaying = false;
  window.dispatchEvent(new CustomEvent('soundplaybackchanged', { detail: { isPlaying: false } }));
}

let lastTrackId = null;

/**
 * Plays a random hype song from the audio folder (pure MP3 playback)
 * @param {(msg: string, type?: string) => void} notify
 */
export function playRandomHypeTrack(notify = () => {}) {
  if (isMuted) return null;

  stopCurrentTrack();

  // Select a random track from candidate tracks (avoiding immediate repeats)
  const candidateTracks = HYPE_TRACKS.filter(t => t.id !== lastTrackId);
  const track = candidateTracks.length > 0
    ? candidateTracks[Math.floor(Math.random() * candidateTracks.length)]
    : HYPE_TRACKS[Math.floor(Math.random() * HYPE_TRACKS.length)];

  lastTrackId = track.id;

  notify(`🎵 ${track.title} — ${track.artist} · ${track.tag}`, 'success');

  try {
    const audio = new Audio(track.src);
    audio.volume = 0.75;
    currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying = true;
        window.dispatchEvent(new CustomEvent('soundplaybackchanged', { detail: { isPlaying: true, track } }));

        audio.onended = () => {
          stopCurrentTrack();
        };

        // Safety timeout to avoid lingering background playback
        playEndTimeout = setTimeout(() => {
          stopCurrentTrack();
        }, 15000);
      }).catch(err => {
        console.warn('Audio playback prevented by browser:', err);
        stopCurrentTrack();
      });
    }
  } catch (err) {
    console.error('Audio playback error:', err);
  }

  return track;
}
