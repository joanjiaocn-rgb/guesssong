const tracks = [
  { title: 'Ode to Joy', genre: 'CLASSICAL', notes: [[330,.28],[330,.28],[349,.28],[392,.28],[392,.28],[349,.28],[330,.28],[294,.28],[262,.28],[262,.28],[294,.28],[330,.28],[330,.42],[294,.42]], choices: ['Ode to Joy','Greensleeves','Frere Jacques','The Entertainer'] },
  { title: 'Twinkle, Twinkle, Little Star', genre: 'TRADITIONAL', notes: [[262,.3],[262,.3],[392,.3],[392,.3],[440,.3],[440,.3],[392,.5],[349,.3],[349,.3],[330,.3],[330,.3],[294,.3],[294,.3],[262,.5]], choices: ['Jingle Bells','Twinkle, Twinkle, Little Star','Ode to Joy','Frere Jacques'] },
  { title: 'Frere Jacques', genre: 'FOLK', notes: [[262,.3],[294,.3],[330,.3],[262,.3],[262,.3],[294,.3],[330,.3],[262,.3],[330,.3],[349,.3],[392,.5],[330,.3],[349,.3],[392,.5]], choices: ['Frere Jacques','Greensleeves','The Entertainer','Twinkle, Twinkle, Little Star'] },
  { title: 'Jingle Bells', genre: 'SEASONAL', notes: [[330,.22],[330,.22],[330,.44],[330,.22],[330,.22],[330,.44],[330,.22],[392,.22],[262,.34],[294,.16],[330,.7]], choices: ['Ode to Joy','Jingle Bells','Frere Jacques','Greensleeves'] },
  { title: 'Greensleeves', genre: 'FOLK', notes: [[330,.35],[392,.5],[440,.35],[494,.35],[523,.55],[494,.35],[440,.5],[349,.35],[392,.5],[440,.35],[349,.35],[330,.65]], choices: ['The Entertainer','Twinkle, Twinkle, Little Star','Greensleeves','Jingle Bells'] }
];
let round = 0, score = 0, hints = 2, answered = false, audioContext = null, playing = false;
const $ = (id) => document.getElementById(id);
const trackEvent = (eventName, parameters = {}) => window.NoteGuessAnalytics?.track(eventName, parameters);
const dayKey = new Date().toISOString().slice(0, 10);
const saved = JSON.parse(localStorage.getItem('noteguess-state') || '{}');
let streak = saved.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? (saved.streak || 0) : (saved.lastDay === dayKey ? (saved.streak || 0) : 0);
$('streak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
$('header-date').textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function makeWaveform() { $('waveform').innerHTML = Array.from({ length: 27 }, (_, i) => `<i style="--h:${12 + ((i * 17) % 37)}px;--d:${(i % 7) * .08}s"></i>`).join(''); }
function render() {
  const track = tracks[round]; answered = false;
  $('round-number').textContent = String(round + 1).padStart(2, '0'); $('score').textContent = String(score).padStart(3, '0'); $('track-genre').textContent = track.genre;
  $('feedback').innerHTML = ''; $('next-button').hidden = true; $('hint-button').disabled = false; $('hint-count').textContent = hints;
  $('answers').innerHTML = track.choices.map((choice, i) => `<button class="answer-option" data-answer="${choice}" type="button"><span>${String.fromCharCode(65 + i)}</span>&nbsp; ${choice}</button>`).join('');
  $('answers').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => choose(button)));
  $('progress').innerHTML = tracks.map((_, i) => `<i class="${i < round ? 'done ' : ''}${i === round ? 'active' : ''}"></i>`).join(''); makeWaveform(); $('play-label').textContent = 'Play clip'; $('play-button').classList.remove('is-playing');
}
function choose(button) {
  if (answered) return; answered = true; const track = tracks[round]; const correct = button.dataset.answer === track.title;
  document.querySelectorAll('.answer-option').forEach((option) => { option.disabled = true; if (option.dataset.answer === track.title) option.classList.add('correct'); }); if (!correct) button.classList.add('wrong');
  const points = correct ? Math.max(20, 100 - (2 - hints) * 20) : 0; score += points; $('score').textContent = String(score).padStart(3, '0');
  trackEvent("guess_answer", { round_number: round + 1, genre: track.genre.toLowerCase(), is_correct: correct, points_awarded: points });
  $('feedback').innerHTML = correct ? `<strong>Nice ear.</strong> +${points} points` : `<strong>Not quite.</strong> It was <span class="hint">${track.title}</span>`; $('next-button').hidden = false; $('hint-button').disabled = true;
}
function playClip() {
  if (playing) return; playing = true; $('play-label').textContent = 'Playing...'; $('play-button').classList.add('is-playing'); const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass) { playing = false; return; }
  trackEvent("play_melody", { round_number: round + 1, genre: tracks[round].genre.toLowerCase() });
  audioContext ||= new AudioContextClass(); const now = audioContext.currentTime + .05; let time = now;
  tracks[round].notes.forEach(([frequency, duration]) => { const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = 'triangle'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(.18, time + .025); gain.gain.exponentialRampToValueAtTime(.0001, time + duration - .025); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(time); oscillator.stop(time + duration); time += duration + .035; });
  setTimeout(() => { playing = false; $('play-label').textContent = 'Replay clip'; $('play-button').classList.remove('is-playing'); }, (time - now) * 1000 + 100);
}
function resultText() { return `NoteGuess ${dayKey}\n${score}/500 points\nA daily guess the song game for curious ears.`; }
function setShareLinks() { const text = encodeURIComponent(resultText()); const url = encodeURIComponent(window.location.href); $('share-x').href = `https://twitter.com/intent/tweet?text=${text}`; $('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`; }
$('play-button').addEventListener('click', playClip);
$('hint-button').addEventListener('click', () => { if (answered || hints < 1) return; hints--; $('hint-count').textContent = hints; const track = tracks[round]; trackEvent("use_hint", { round_number: round + 1, genre: track.genre.toLowerCase(), hints_remaining: hints }); $('feedback').innerHTML = `<span class="hint">Hint:</span> this is a ${track.genre.toLowerCase()} melody. It begins with "${track.title[0]}".`; if (hints === 0) $('hint-button').disabled = true; });
$('next-button').addEventListener('click', () => { if (round < tracks.length - 1) { round++; render(); } else { streak++; localStorage.setItem('noteguess-state', JSON.stringify({ lastDay: dayKey, streak })); $('streak').textContent = `${streak} days`; $('feedback').innerHTML = `<strong>Perfect, you made it.</strong> Final score: ${score}/500`; $('next-button').hidden = true; trackEvent("game_complete", { final_score: score, streak_days: streak }); } });
$('share-x').addEventListener('click', () => trackEvent("share_result", { share_method: "x", score }));
$('share-facebook').addEventListener('click', () => trackEvent("share_result", { share_method: "facebook", score }));
$('share-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(resultText()); trackEvent("share_result", { share_method: "copy", score }); $('share-copy').innerHTML = '<span aria-hidden="true">OK</span> Copied'; setTimeout(() => { $('share-copy').innerHTML = '<span aria-hidden="true">+</span> Copy result'; }, 1800); } catch {} });
setShareLinks(); render();
