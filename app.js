const tracks = [
  { title: 'Ode to Joy', genre: 'CLASSICAL', notes: [[330,.28],[330,.28],[349,.28],[392,.28],[392,.28],[349,.28],[330,.28],[294,.28],[262,.28],[262,.28],[294,.28],[330,.28],[330,.42],[294,.42]], choices: ['Ode to Joy','Greensleeves','Frere Jacques','The Entertainer'] },
  { title: 'Twinkle, Twinkle, Little Star', genre: 'TRADITIONAL', notes: [[262,.3],[262,.3],[392,.3],[392,.3],[440,.3],[440,.3],[392,.5],[349,.3],[349,.3],[330,.3],[330,.3],[294,.3],[294,.3],[262,.5]], choices: ['Jingle Bells','Twinkle, Twinkle, Little Star','Ode to Joy','Frere Jacques'] },
  { title: 'Frere Jacques', genre: 'FOLK', notes: [[262,.3],[294,.3],[330,.3],[262,.3],[262,.3],[294,.3],[330,.3],[262,.3],[330,.3],[349,.3],[392,.5],[330,.3],[349,.3],[392,.5]], choices: ['Frere Jacques','Greensleeves','The Entertainer','Twinkle, Twinkle, Little Star'] },
  { title: 'Jingle Bells', genre: 'SEASONAL', notes: [[330,.22],[330,.22],[330,.44],[330,.22],[330,.22],[330,.44],[330,.22],[392,.22],[262,.34],[294,.16],[330,.7]], choices: ['Ode to Joy','Jingle Bells','Frere Jacques','Greensleeves'] },
  { title: 'Greensleeves', genre: 'FOLK', notes: [[330,.35],[392,.5],[440,.35],[494,.35],[523,.55],[494,.35],[440,.5],[349,.35],[392,.5],[440,.35],[349,.35],[330,.65]], choices: ['The Entertainer','Twinkle, Twinkle, Little Star','Greensleeves','Jingle Bells'] }
];

const shareUrl = 'https://guesssong.me/';
const $ = (id) => document.getElementById(id);
const trackEvent = (eventName, parameters = {}) => window.NoteGuessAnalytics?.track(eventName, parameters);
const dayKey = new Date().toISOString().slice(0, 10);
const yesterdayKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const saved = JSON.parse(localStorage.getItem('noteguess-state') || '{}');

let round = 0;
let score = 0;
let hints = 2;
let correctAnswers = 0;
let answered = false;
let audioContext = null;
let playing = false;
let playbackTimer = null;
let transitionTimer = null;
let activeSources = [];
let streak = saved.lastDay === yesterdayKey || saved.lastDay === dayKey ? (saved.streak || 0) : 0;

$('streak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
$('header-date').textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function makeWaveform() {
  $('waveform').innerHTML = Array.from({ length: 27 }, (_, i) => `<i style="--h:${12 + ((i * 17) % 37)}px;--d:${(i % 7) * .08}s"></i>`).join('');
}

function updateScore() {
  $('score').textContent = String(score).padStart(3, '0');
}

function resultText() {
  return `I scored ${score}/500 points in Guess the Song Game.\nCan you beat me? ${shareUrl}`;
}

function setShareLinks() {
  const text = encodeURIComponent(resultText());
  const facebookUrl = encodeURIComponent(shareUrl);
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${facebookUrl}&quote=${text}`;
  const x = `https://twitter.com/intent/tweet?text=${text}`;

  $('share-x').href = x;
  $('result-share-x').href = x;
  $('share-facebook').href = facebook;
  $('result-share-facebook').href = facebook;
}

function stopPlayback() {
  activeSources.forEach((source) => {
    try { source.stop(); } catch {}
  });
  activeSources = [];
  window.clearTimeout(playbackTimer);
  playbackTimer = null;
  playing = false;
  $('play-label').textContent = 'Replay clip';
  $('play-button').classList.remove('is-playing');
}

function setListenNote(message) {
  $('listen-note').textContent = message;
}

async function unlockAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'running') return true;

  try {
    await audioContext.resume();
    return audioContext.state === 'running';
  } catch {
    return false;
  }
}

async function playClip({ auto = false } = {}) {
  if (playing) return;
  const canPlay = await unlockAudio();
  if (!canPlay) {
    if (auto) setListenNote('Your browser needs one sound tap. Press replay clip.');
    return;
  }

  stopPlayback();
  playing = true;
  $('play-label').textContent = 'Playing...';
  $('play-button').classList.add('is-playing');
  setListenNote(auto ? 'Playing this melody now' : 'Playing the melody');
  trackEvent('play_melody', { round_number: round + 1, genre: tracks[round].genre.toLowerCase(), play_source: auto ? 'autoplay' : 'replay' });

  const now = audioContext.currentTime + .05;
  let time = now;
  tracks[round].notes.forEach(([frequency, duration]) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(.18, time + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration - .025);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + duration);
    activeSources.push(oscillator);
    time += duration + .035;
  });

  playbackTimer = window.setTimeout(() => {
    activeSources = [];
    playing = false;
    $('play-label').textContent = 'Replay clip';
    $('play-button').classList.remove('is-playing');
    setListenNote('Replay whenever you need another listen');
  }, (time - now) * 1000 + 100);
}

function render({ autoplay = false } = {}) {
  window.clearTimeout(transitionTimer);
  stopPlayback();
  const track = tracks[round];
  answered = false;

  $('round-number').textContent = String(round + 1).padStart(2, '0');
  updateScore();
  $('track-genre').textContent = track.genre;
  $('feedback').innerHTML = '';
  $('hint-button').disabled = hints === 0;
  $('hint-count').textContent = hints;
  setListenNote('Your melody starts automatically');
  $('answers').innerHTML = track.choices.map((choice, i) => `<button class="answer-option" data-answer="${choice}" type="button"><span>${String.fromCharCode(65 + i)}</span>&nbsp; ${choice}</button>`).join('');
  $('answers').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => choose(button)));
  $('progress').innerHTML = tracks.map((_, i) => `<i class="${i < round ? 'done ' : ''}${i === round ? 'active' : ''}"></i>`).join('');
  makeWaveform();

  if (autoplay) window.setTimeout(() => playClip({ auto: true }), 120);
}

function completeGame() {
  const latest = JSON.parse(localStorage.getItem('noteguess-state') || '{}');
  if (latest.lastDay !== dayKey) {
    streak = latest.lastDay === yesterdayKey ? (latest.streak || 0) + 1 : 1;
    localStorage.setItem('noteguess-state', JSON.stringify({ lastDay: dayKey, streak }));
  } else {
    streak = latest.streak || streak;
  }

  $('streak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  setShareLinks();
  trackEvent('game_complete', { final_score: score, correct_answers: correctAnswers, streak_days: streak });
  showResults();
}

function showResults() {
  const dialog = $('result-dialog');
  $('result-score').textContent = String(score).padStart(3, '0');
  $('result-summary').textContent = `${correctAnswers} of ${tracks.length} melodies correct. Your result is ready to share.`;
  setShareLinks();
  if (!dialog.open) dialog.showModal();
}

function choose(button) {
  if (answered) return;
  answered = true;
  const track = tracks[round];
  const correct = button.dataset.answer === track.title;

  document.querySelectorAll('.answer-option').forEach((option) => {
    option.disabled = true;
    if (option.dataset.answer === track.title) option.classList.add('correct');
  });
  if (!correct) button.classList.add('wrong');

  const points = correct ? Math.max(20, 100 - (2 - hints) * 20) : 0;
  score += points;
  if (correct) correctAnswers++;
  updateScore();
  setShareLinks();
  trackEvent('guess_answer', { round_number: round + 1, genre: track.genre.toLowerCase(), is_correct: correct, points_awarded: points });
  $('feedback').innerHTML = correct
    ? `<strong>Nice ear.</strong> +${points} points. Next melody coming up...`
    : `<strong>Not quite.</strong> It was <span class="hint">${track.title}</span>. Next melody coming up...`;
  $('hint-button').disabled = true;

  transitionTimer = window.setTimeout(() => {
    if (round < tracks.length - 1) {
      round++;
      render({ autoplay: true });
      return;
    }
    completeGame();
  }, 1000);
}

async function copyResult(button) {
  const original = button.innerHTML;
  try {
    await navigator.clipboard.writeText(resultText());
    trackEvent('share_result', { share_method: 'copy', score });
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy unavailable';
  }
  window.setTimeout(() => { button.innerHTML = original; }, 1800);
}

function restartGame() {
  $('result-dialog').close();
  window.clearTimeout(transitionTimer);
  round = 0;
  score = 0;
  hints = 2;
  correctAnswers = 0;
  answered = false;
  setShareLinks();
  render({ autoplay: true });
}

window.addEventListener('pointerdown', () => { unlockAudio(); }, { once: true });
$('play-button').addEventListener('click', () => playClip());
$('hint-button').addEventListener('click', () => {
  if (answered || hints < 1) return;
  hints--;
  $('hint-count').textContent = hints;
  const track = tracks[round];
  trackEvent('use_hint', { round_number: round + 1, genre: track.genre.toLowerCase(), hints_remaining: hints });
  $('feedback').innerHTML = `<span class="hint">Hint:</span> this is a ${track.genre.toLowerCase()} melody. It begins with "${track.title[0]}".`;
  if (hints === 0) $('hint-button').disabled = true;
});

['share-x', 'result-share-x'].forEach((id) => $(id).addEventListener('click', () => trackEvent('share_result', { share_method: 'x', score })));
['share-facebook', 'result-share-facebook'].forEach((id) => $(id).addEventListener('click', () => trackEvent('share_result', { share_method: 'facebook', score })));
['share-copy', 'result-copy'].forEach((id) => $(id).addEventListener('click', () => copyResult($(id))));
$('result-close').addEventListener('click', () => $('result-dialog').close());
$('play-again').addEventListener('click', restartGame);

setShareLinks();
render({ autoplay: true });
