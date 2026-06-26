const STORAGE_KEY = 'TeacherSupportStudioStandalone_v1';
const MODEL_MODE_KEY = 'TeacherSupportStudioStandalone_modelMode';
const MODEL_PRESET_KEY = 'TeacherSupportStudioStandalone_modelPreset';
const LESSON_LANGUAGE_KEY = 'TeacherSupportStudioStandalone_lessonLanguage';
const MODEL_PROVIDER_KEY = 'TeacherSupportStudioStandalone_modelProvider';
const MODEL_BASE_URL_KEY = 'TeacherSupportStudioStandalone_modelBaseUrl';
const MODEL_API_KEY = 'TeacherSupportStudioStandalone_modelApiKey';
const MAX_SESSIONS = 100;
localStorage.removeItem(MODEL_API_KEY);

const lessonTemplates = {
  English: [
    { title: 'Warm-up', text: 'Activate vocabulary and recall the lesson goal.' },
    { title: 'Guided practice', text: 'Work through two examples with hints and correction.' },
    { title: 'Independent task', text: 'Student solves a short task with minimal help.' },
    { title: 'Exit ticket', text: 'One quick question plus a homework suggestion.' }
  ],
  Math: [
    { title: 'Warm-up', text: 'Activate the key formula or idea through a short recall.' },
    { title: 'Guided practice', text: 'Work through two examples with hints and correction.' },
    { title: 'Independent task', text: 'Student solves a short task with minimal help.' },
    { title: 'Exit ticket', text: 'One quick problem plus a homework suggestion.' }
  ]
};

const lessonTemplatesSk = {
  English: [
    { title: 'Rozohriatie', text: 'Aktivuj slovnú zásobu a pripomeň cieľ hodiny.' },
    { title: 'Riadené precvičenie', text: 'Prejdi dve ukážky s nápovedou a opravou.' },
    { title: 'Samostatná úloha', text: 'Žiak rieši krátku úlohu s minimálnou pomocou.' },
    { title: 'Exit ticket', text: 'Jedna rýchla otázka a návrh domácej úlohy.' }
  ],
  Math: [
    { title: 'Rozohriatie', text: 'Aktivuj kľúčový vzorec alebo myšlienku cez krátke pripomenutie.' },
    { title: 'Riadené precvičenie', text: 'Prejdi dve ukážky s nápovedou a opravou.' },
    { title: 'Samostatná úloha', text: 'Žiak rieši krátku úlohu s minimálnou pomocou.' },
    { title: 'Exit ticket', text: 'Jeden rýchly príklad a návrh domácej úlohy.' }
  ]
};

const modelPresetCatalog = {
  'qwen2.5-0.5b-instruct': { label: 'Qwen2.5-0.5B-Instruct', note: 'Najľahší testovací preset pre rýchle lokálne overenie.' },
  'qwen2.5-1.5b-instruct': { label: 'Qwen2.5-1.5B-Instruct', note: 'Stále ľahký, vhodný pre skúšobný backend.' },
  'qwen2.5-3b-instruct': { label: 'Qwen2.5-3B-Instruct', note: 'Odporúčaný open test preset pre rýchly pilot.' },
  'qwen2.5-7b-instruct': { label: 'Qwen2.5-7B-Instruct', note: 'Silnejší open test preset, kvalita je vyššia, nároky väčšie.' }
};

const subjectThemes = {
  English: {
    className: 'english',
    tag: 'Language',
    title: 'English lesson flow',
    desc: 'Vocabulary, grammar, and speaking are emphasized with short, classroom-ready tasks.',
    items: ['Grammar focus', 'Speaking', 'Vocabulary', 'Exit check']
  },
  Math: {
    className: 'math',
    tag: 'Numbers',
    title: 'Math lesson flow',
    desc: 'This view favors formulas, worked examples, and clear step-by-step practice.',
    items: ['Formula recall', 'Worked example', 'Practice', 'Quick check']
  }
};

const subjectLessonCatalog = {
  English: {
    topicLabel: 'Topic',
    levelLabel: 'CEFR level',
    topics: ['Present Simple', 'Past Simple', 'Question forms', 'Vocabulary review', 'Reading practice', 'Speaking fluency'],
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    defaultTopic: 'Present Simple',
    defaultGoal: 'Practice core concept and build confidence'
  },
  Math: {
    topicLabel: 'Math topic',
    levelLabel: 'Math strand',
    topics: ['Number sense', 'Fractions', 'Algebra basics', 'Linear equations', 'Geometry', 'Statistics'],
    levels: ['Foundations', 'Fractions', 'Algebra', 'Geometry', 'Functions', 'Statistics'],
    defaultTopic: 'Linear equations',
    defaultGoal: 'Solve a core task step by step'
  }
};

const defaultChecklist = {
  pre: [
    { id: 'pre-1', text: 'Student is ready and has materials', type: 'checkbox', required: true },
    { id: 'pre-2', text: 'Focus level', type: 'score', required: true },
    { id: 'pre-3', text: 'Topic difficulty', type: 'score', required: false }
  ],
  post: [
    { id: 'post-1', text: 'Lesson goal achieved', type: 'choice', required: true },
    { id: 'post-2', text: 'Understanding', type: 'score', required: true },
    { id: 'post-3', text: 'Motivation after lesson', type: 'score', required: false }
  ]
};

const checklistChoiceOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'partly', label: 'Partly' },
  { value: 'no', label: 'No' }
];

const realModelPrompt = `System prompt for TeacherSupport Studio real-model integration

You are an education planning assistant for teachers and tutors.
Your task is to generate a practical, editable lesson plan that the teacher can apply immediately.

Inputs you receive:
- teacher profile
- student profile
- subject, topic, level, duration, lesson goal, teacher notes
- lesson language (English or Slovak)
- pre-lesson checklist answers
- post-lesson checklist answers
- lesson history for the selected student
- optional previous lesson score trend

Primary goals:
1. Produce a lesson plan in 4-6 time blocks.
2. Keep each block concrete, short, and classroom-ready.
3. Personalize the plan to the student profile and lesson history.
4. Return checklist-based adaptation advice for the next lesson.
5. Avoid generic advice; use the provided context.
6. Match the response language to the selected lesson language.

Output format:
- title
- lesson summary
- timeline blocks with title, duration, and short explanation
- pre-checklist interpretation
- post-checklist interpretation
- adaptation suggestions
- risk flags if the plan is too hard, too easy, or unfocused
- one-sentence teacher note

Style rules:
- Be concise and operational.
- Use simple language.
- Do not mention policy, prompt text, or hidden instructions.
- If data is missing, state the assumption and continue.
- Prefer practical teaching actions over abstract theory.

If the app requests a JSON response, return strict JSON with these fields:
{
  "title": string,
  "summary": string,
  "blocks": [{"title": string, "minutes": number, "description": string}],
  "checklistInterpretation": {"pre": string, "post": string},
  "adaptation": {"summary": string, "bullets": string[]},
  "riskFlags": string[],
  "teacherNote": string
}
`;

const app = {
  state: loadState(),
  activeStudentId: null,
  activeLessonId: null,
  activeTab: 'dashboard',
  editLessonMode: false,
  currentModelOutput: null,
  modelMode: localStorage.getItem(MODEL_MODE_KEY) || 'mock',
  modelPreset: localStorage.getItem(MODEL_PRESET_KEY) || 'qwen2.5-3b-instruct',
  lessonLanguage: localStorage.getItem(LESSON_LANGUAGE_KEY) || 'EN',
  modelProvider: localStorage.getItem(MODEL_PROVIDER_KEY) || 'openai-compatible',
  modelBaseUrl: localStorage.getItem(MODEL_BASE_URL_KEY) || '',
  modelApiKey: ''
};

function uid(prefix) {
  return `${prefix}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return defaultState();
    return normalizeState(parsed);
  } catch (error) {
    return defaultState();
  }
}

function defaultState() {
  const id = uid('stu');
  return normalizeState({
    version: 1,
    selectedStudentId: id,
    students: [
      {
        id,
        name: 'Demo Student',
        subject: 'English',
        notes: 'Responds well to short tasks and visual prompts.',
        checklistTemplate: defaultChecklist,
        createdAt: new Date().toISOString()
      }
    ],
    lessons: [],
    teacher: { name: 'Teacher', role: 'Tutor' }
  });
}

function normalizeState(state) {
  state.version = 1;
  state.teacher = state.teacher || { name: 'Teacher', role: 'Tutor' };
  state.students = Array.isArray(state.students) ? state.students : [];
  state.lessons = Array.isArray(state.lessons) ? state.lessons : [];

  if (!state.students.length) {
    const id = uid('stu');
    state.students.push({
      id,
      name: 'Demo Student',
      subject: 'English',
      notes: '',
      checklistTemplate: defaultChecklist,
      createdAt: new Date().toISOString()
    });
    state.selectedStudentId = id;
  }

  state.students = state.students.map(student => ({
    ...student,
    checklistTemplate: sanitizeChecklist(student.checklistTemplate)
  }));

  if (!state.selectedStudentId || !state.students.some(student => student.id === state.selectedStudentId)) {
    state.selectedStudentId = state.students[0].id;
  }

  return state;
}

function sanitizeChecklist(checklist) {
  const base = checklist || defaultChecklist;
  return {
    pre: Array.isArray(base.pre) ? base.pre.map(normalizeQuestion) : defaultChecklist.pre,
    post: Array.isArray(base.post) ? base.post.map(normalizeQuestion) : defaultChecklist.post
  };
}

function normalizeQuestion(question, index = 0) {
  const type = ['checkbox', 'score', 'choice'].includes(question.type) ? question.type : 'score';
  return {
    id: question.id || `q_${index}`,
    text: question.text || 'Question',
    type,
    required: Boolean(question.required),
    options: type === 'choice' ? normalizeChecklistChoiceOptions(question.options) : undefined
  };
}

function normalizeChecklistChoiceOptions(options) {
  if (!Array.isArray(options) || !options.length) return checklistChoiceOptions;
  const normalized = options
    .map(option => ({
      value: String(option?.value || '').trim(),
      label: String(option?.label || option?.value || '').trim()
    }))
    .filter(option => option.value && option.label);
  return normalized.length ? normalized : checklistChoiceOptions;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(app.state));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numericAverage(values) {
  const valid = values.filter(value => Number.isFinite(Number(value))).map(value => Number(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function collectEmotionAverage(plan) {
  const values = Array.isArray(plan) ? plan.map(block => Number(block.emotion || 0)) : [];
  return numericAverage(values);
}

function answerValueToScore(value) {
  if (value === true) return 10;
  if (value === false) return 0;
  if (Number.isFinite(Number(value))) return clamp(Number(value), 0, 10);
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['yes', 'true', 'done', 'ok'].includes(normalized)) return 10;
  if (['partly', 'partial', 'somewhat', 'maybe'].includes(normalized)) return 5;
  if (['no', 'false', 'none'].includes(normalized)) return 0;
  return null;
}

function analyzeChecklistAnswers(answers) {
  const totalCount = Array.isArray(answers) ? answers.length : 0;
  if (!totalCount) {
    return {
      totalCount: 0,
      filledCount: 0,
      filledScore: 0,
      positiveCheckboxScore: 0,
      numericAverage: 0
    };
  }

  const filledCount = answers.filter(answer => answer.value !== '' && answer.value !== null && answer.value !== undefined).length;
  const positiveCheckboxCount = answers.filter(answer => answer.value === true || answer.value === 'yes').length;
  const numericValues = answers.map(answer => answerValueToScore(answer.value)).filter(value => Number.isFinite(value));

  return {
    totalCount,
    filledCount,
    filledScore: (filledCount / totalCount) * 10,
    positiveCheckboxScore: (positiveCheckboxCount / totalCount) * 10,
    numericAverage: numericValues.length ? numericAverage(numericValues) : 0
  };
}

function checklistCompletionScore(answers) {
  return analyzeChecklistAnswers(answers).filledScore;
}

function deriveSessionInsights({ output, plan, preAnswers, postAnswers, input, student }) {
  const preStats = analyzeChecklistAnswers(preAnswers);
  const postStats = analyzeChecklistAnswers(postAnswers);
  const preText = `Pre-checklist suggests ${preStats.numericAverage >= 7 ? 'good readiness' : 'some preparation gaps'}.`;
  const postText = `Post-checklist suggests ${postStats.numericAverage >= 7 ? 'the goal was largely met' : 'the next lesson should slow down a little'}.`;
  const postScore = postStats.numericAverage;
  const preScore = preStats.numericAverage;
  const emotionAvg = collectEmotionAverage(plan);
  const sessionScore = Math.round(clamp((postScore * 0.5) + (preScore * 0.15) + (postStats.filledScore * 0.2) + ((5 + emotionAvg * 1.5) * 0.15), 0, 10));

  const riskFlags = [
    postScore < 6 ? 'Revisit the core concept before moving on.' : null,
    emotionAvg < -0.5 ? 'Several lesson blocks look demanding; add a simpler scaffold next time.' : null,
    preStats.filledScore < 6 ? 'Pre-lesson readiness is uneven.' : null,
    postStats.filledScore < 10 ? 'Some post-checklist answers are still incomplete.' : null
  ].filter(Boolean);

  const adaptation = {
    summary: postScore >= 7
      ? 'Next lesson can increase challenge slightly and reuse the strongest activity type.'
      : 'Next lesson should repeat the core idea with a shorter guided section and one clearer check.',
    bullets: [
      postScore >= 7 ? 'Add one stretch task.' : 'Reduce the cognitive load in the guided block.',
      postStats.filledScore >= 7 ? 'Keep the same lesson structure.' : 'Insert one extra comprehension check.',
      postAnswers.some(answer => answer.value === 'no' || answer.value === false)
        ? 'Treat the lesson goal as not fully achieved and slow the next lesson down.'
        : 'Use the current lesson pacing as the default next-step baseline.',
      student.notes ? `Respect the student note: ${student.notes}` : 'Use the student profile notes more explicitly.'
    ]
  };

  const teacherNote = `Focus next time on ${input.topic || input.subject} and keep the pace aligned with the checklist feedback.`;

  return {
    checklistInterpretation: {
      pre: preText,
      post: postText
    },
    adaptation,
    riskFlags,
    teacherNote,
    sessionScore
  };
}

function $(id) {
  return document.getElementById(id);
}

function setActiveTab(tabName) {
  app.activeTab = tabName;
  document.querySelectorAll('.tab').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabName);
  });
}

function activeStudent() {
  return app.state.students.find(student => student.id === app.activeStudentId) || app.state.students[0];
}

function activeChecklist() {
  return activeStudent()?.checklistTemplate || defaultChecklist;
}

function updateMetrics() {
  const lessons = app.state.lessons;
  const scores = lessons.map(lesson => Number(lesson.sessionScore ?? lesson.score ?? 0)).filter(score => Number.isFinite(score));
  const avgScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  $('metricStudents').textContent = String(app.state.students.length);
  $('metricLessons').textContent = String(lessons.length);
  $('metricAvgScore').textContent = `${avgScore}/10`;
  if (app.modelMode === 'real') {
    $('metricModel').textContent = 'Real';
  } else if (app.modelMode === 'test') {
    $('metricModel').textContent = 'Test';
  } else {
    $('metricModel').textContent = 'Mock';
  }
}

function renderStudentList(filter = '') {
  const wrap = $('studentList');
  const query = filter.trim().toLowerCase();
  const students = app.state.students.filter(student => {
    const text = `${student.name} ${student.subject} ${student.notes}`.toLowerCase();
    return !query || text.includes(query);
  });

  wrap.innerHTML = '';
  if (!students.length) {
    wrap.innerHTML = '<div class="muted">No students found.</div>';
    return;
  }

  students.forEach(student => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-item';
    item.innerHTML = `
      <div class="dot"></div>
      <div>
        <strong>${escapeHtml(student.name)}</strong>
        <span>${escapeHtml(student.subject || '—')} · ${escapeHtml(student.notes || 'No notes')}</span>
      </div>
      <div class="list-pill">${student.id === app.activeStudentId ? 'Active' : 'Open'}</div>
    `;
    item.addEventListener('click', () => selectStudent(student.id));
    wrap.appendChild(item);
  });
}

function selectStudent(studentId) {
  app.activeStudentId = studentId;
  app.state.selectedStudentId = studentId;
  const student = activeStudent();
  updateChatContextBar();
  $('studentName').value = student.name || '';
  $('studentSubject').value = student.subject || 'English';
  $('studentNotes').value = student.notes || '';
  $('studentChecklistJson').value = JSON.stringify(student.checklistTemplate || defaultChecklist, null, 2);
  $('lessonStudentLabel').textContent = student.name || 'Student';
  renderChecklistEditor();
  renderLesson();
  renderHistory();
  renderAnalytics();
  renderDashboard();
  saveState();
  renderStudentList($('studentSearch').value || '');
}

function addStudent() {
  const newId = uid('stu');
  const student = {
    id: newId,
    name: 'New student',
    subject: 'English',
    notes: '',
    checklistTemplate: defaultChecklist,
    createdAt: new Date().toISOString()
  };
  app.state.students.unshift(student);
  app.activeStudentId = newId;
  app.state.selectedStudentId = newId;
  saveState();
  syncStudentForm();
  renderStudentList();
  renderLesson();
  renderAnalytics();
  renderDashboard();
  updateMetrics();
}

function syncStudentForm() {
  const student = activeStudent();
  $('studentName').value = student.name || '';
  $('studentSubject').value = student.subject || 'English';
  $('studentNotes').value = student.notes || '';
  $('studentChecklistJson').value = JSON.stringify(student.checklistTemplate || defaultChecklist, null, 2);
  renderChecklistEditor();
  $('lessonStudentLabel').textContent = student.name || 'Student';
}

function saveStudent() {
  const student = activeStudent();
  student.name = $('studentName').value.trim() || 'Unnamed student';
  student.subject = $('studentSubject').value;
  student.notes = $('studentNotes').value.trim();
  // If the visual editor is present, prefer its structured data (editor updates student.checklistTemplate directly).
  if (document.getElementById('checklistEditor')) {
    student.checklistTemplate = sanitizeChecklist(student.checklistTemplate || defaultChecklist);
    $('studentChecklistJson').value = JSON.stringify(student.checklistTemplate, null, 2);
  } else {
    try {
      const parsed = JSON.parse($('studentChecklistJson').value);
      student.checklistTemplate = sanitizeChecklist(parsed);
    } catch (error) {
      alert(`Checklist JSON is invalid: ${error.message}`);
      return;
    }
  }
  saveState();
  renderStudentList($('studentSearch').value || '');
  renderLesson();
  renderHistory();
  renderAnalytics();
  renderDashboard();
  updateMetrics();
}

function resetStudentChecklist() {
  const student = activeStudent();
  student.checklistTemplate = defaultChecklist;
  $('studentChecklistJson').value = JSON.stringify(defaultChecklist, null, 2);
  renderChecklistEditor();
  saveState();
  renderLesson();
  renderDashboard();
}

function lessonDuration() {
  return Number($('lessonDuration').value || 45);
}

function updateDurationLabel() {
  $('lessonDurationLabel').textContent = `${lessonDuration()} min`;
}

function currentLessonInput() {
  return {
    subject: $('lessonSubject').value,
    topic: $('lessonTopic').value.trim(),
    goal: $('lessonGoal').value.trim(),
    level: $('lessonLevel').value,
    language: $('lessonLanguage').value || app.lessonLanguage || 'EN',
    duration: lessonDuration(),
    notes: $('lessonNotes').value.trim()
  };
}

function buildLessonBlocks(subject, language = 'EN') {
  const templates = language === 'SK' ? lessonTemplatesSk : lessonTemplates;
  return templates[subject] || templates.English;
}

function buildModelContext(input, student) {
  return {
    teacher: app.state.teacher,
    student: {
      id: student.id,
      name: student.name,
      subject: student.subject,
      notes: student.notes,
      checklistTemplate: student.checklistTemplate,
      lessonCount: app.state.lessons.filter(lesson => lesson.studentId === student.id).length
    },
    lesson: input,
    checklistTemplate: student.checklistTemplate,
    history: app.state.lessons.filter(lesson => lesson.studentId === student.id).slice(0, 5).map(lesson => ({
      topic: lesson.input?.topic,
      subject: lesson.input?.subject,
      score: lesson.sessionScore,
      language: lesson.input?.language,
      createdAt: lesson.createdAt
    })),
    modelPreset: app.modelPreset,
    modelLanguage: input.language || 'EN'
  };
}

function resolveModelEndpoint() {
  const base = (app.modelBaseUrl || '').trim();
  if (!base) return '';
  const normalized = base.replace('http://localhost:8000', 'http://127.0.0.1:8000').replace('https://localhost:8000', 'https://127.0.0.1:8000');
  if (normalized.includes('/chat/completions')) return normalized;
  return normalized.replace(/\/$/, '') + '/chat/completions';
}

function updateModelUiFromState() {
  const provider = $('modelProvider');
  const baseUrl = $('modelBaseUrl');
  const apiKey = $('modelApiKey');
  const preset = $('modelPreset');
  const language = $('lessonLanguage');
  if (provider) provider.value = app.modelProvider;
  if (baseUrl) baseUrl.value = (app.modelBaseUrl || '').replace('http://localhost:8000', 'http://127.0.0.1:8000');
  if (apiKey) apiKey.value = app.modelApiKey;
  if (preset) preset.value = app.modelPreset;
  if (language) language.value = app.lessonLanguage;
  // show/hide advanced model settings depending on mode
  const adv = document.getElementById('advancedModelSettings');
  if (adv) adv.style.display = app.modelMode === 'real' ? '' : 'none';
  // update simple model buttons active state
  const mockBtn = document.getElementById('btnModelMock');
  const testBtn = document.getElementById('btnModelTest');
  const realBtn = document.getElementById('btnModelReal');
  if (mockBtn) mockBtn.classList.toggle('tab-active', app.modelMode === 'mock');
  if (testBtn) testBtn.classList.toggle('tab-active', app.modelMode === 'test');
  if (realBtn) realBtn.classList.toggle('tab-active', app.modelMode === 'real');
}

function toggleChecklistJsonVisibility() {
  const wrap = document.getElementById('studentChecklistJsonWrap');
  const btn = document.getElementById('btnToggleChecklistJson');
  if (!wrap || !btn) return;
  const visible = wrap.style.display !== 'none';
  wrap.style.display = visible ? 'none' : '';
  btn.textContent = visible ? 'Show advanced JSON' : 'Hide advanced JSON';
}

function setSimpleModelMode(mode) {
  if (!['mock', 'test', 'real'].includes(mode)) return;
  app.modelMode = mode;
  localStorage.setItem(MODEL_MODE_KEY, mode);
  updateModelUiFromState();
  toggleModelMode(mode);
}

function applySubjectTheme(subject) {
  const theme = subjectThemes[subject] || subjectThemes.English;
  document.body.dataset.subjectTheme = theme.className;
  document.body.classList.remove('subject-theme-body', 'english', 'math');
  document.body.classList.add('subject-theme-body', theme.className);
  const focus = $('subjectFocus');
  if (!focus) return;
  focus.className = `subject-focus ${theme.className}`;
  focus.innerHTML = `
    <div class="sf-top">
      <div class="sf-title">${escapeHtml(theme.title)}</div>
      <div class="sf-tag">${escapeHtml(theme.tag)}</div>
    </div>
    <div class="sf-desc">${escapeHtml(theme.desc)}</div>
    <div class="sf-list">${theme.items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
  `;
}

function getSubjectLessonConfig(subject) {
  return subjectLessonCatalog[subject] || subjectLessonCatalog.English;
}

function fillSelectOptions(select, values, selectedValue) {
  if (!select) return;
  const current = selectedValue ?? select.value;
  select.innerHTML = values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  if (values.includes(current)) {
    select.value = current;
  } else if (values.length) {
    select.value = values[0];
  }
}

function applySubjectLessonCatalog(subject) {
  const config = getSubjectLessonConfig(subject);
  const topicSelect = $('lessonTopic');
  const levelSelect = $('lessonLevel');
  const topicLabel = $('lessonTopicLabel');
  const levelLabel = $('lessonLevelLabel');
  if (topicLabel) topicLabel.textContent = config.topicLabel;
  if (levelLabel) levelLabel.textContent = config.levelLabel;
  fillSelectOptions(topicSelect, config.topics, topicSelect?.value || config.defaultTopic);
  fillSelectOptions(levelSelect, config.levels, levelSelect?.value || config.levels[0]);
  if (topicSelect && !topicSelect.value) topicSelect.value = config.defaultTopic;
  if (levelSelect && !levelSelect.value) levelSelect.value = config.levels[0];
}

async function requestLessonFromModel(input, student) {
  const endpoint = resolveModelEndpoint();
  if (!endpoint) return null;

  const systemPrompt = realModelPrompt;
  const payload = buildModelContext(input, student);
  const body = {
    model: app.modelPreset,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(payload, null, 2) }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(app.modelApiKey ? { 'Authorization': `Bearer ${app.modelApiKey}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Model request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || data?.output_text || '';
  if (!content) return null;

  try {
    return typeof content === 'string' ? JSON.parse(content) : content;
  } catch (error) {
    return null;
  }
}

function applyGeneratedModelOutput(output, input, student) {
  const blocks = Array.isArray(output?.blocks) && output.blocks.length
    ? output.blocks
    : buildLessonBlocks(input.subject, input.language).map((block, index) => ({
        title: block.title,
        minutes: allocateDurations(input.duration, 4)[index] || 5,
        description: block.text
      }));

  const plan = blocks.map((block, index) => ({
    index: index + 1,
    title: block.title || `Step ${index + 1}`,
    minutes: Number(block.minutes || 10),
    description: block.description || block.text || '',
    emotion: 0
  }));

  $('lessonMeta').innerHTML = `
    <strong>${escapeHtml(input.subject)}</strong> · ${escapeHtml(input.level)} · ${input.duration} min · ${escapeHtml(input.language || 'EN')}
    <br>${input.language === 'SK' ? 'Téma' : 'Topic'}: ${escapeHtml(input.topic || '—')} · ${input.language === 'SK' ? 'Žiak' : 'Student'}: ${escapeHtml(student.name || 'Student')}
  `;
  renderTimeline(plan);
  renderChecklists(student.checklistTemplate);
  renderEmotionMap(plan);
  app.currentPlan = plan;
  app.currentModelOutput = output;
  renderAdaptationBlock(output);
  // show risk flags and teacher note in validation box if present
  const box = $('validationBox');
  if (Array.isArray(output?.riskFlags) && output.riskFlags.length) {
    box.className = 'validation-box error';
    box.innerHTML = 'Risk flags: ' + output.riskFlags.map(r => escapeHtml(r)).join(' · ');
  } else if (output?.teacherNote) {
    box.className = 'validation-box ok';
    box.textContent = output.teacherNote;
  }
  if (!output?.riskFlags?.length && !output?.teacherNote) {
    setValidationMessage(`${output?.title || 'Model'} response applied.`, 'ok');
  }
}

async function generateLessonPlan() {
  const input = currentLessonInput();
  app.lessonLanguage = input.language || 'EN';
  localStorage.setItem(LESSON_LANGUAGE_KEY, app.lessonLanguage);
  const student = activeStudent();
  applySubjectTheme(input.subject);

  if (app.modelMode === 'test' || app.modelMode === 'real') {
    try {
      const output = await requestLessonFromModel(input, student);
      if (output) {
        app.currentModelOutput = output;
        applyGeneratedModelOutput(output, input, student);
        return;
      }
    } catch (error) {
      console.warn('Model generation failed, falling back to templates', error);
      setValidationMessage('Model request failed, falling back to local templates.', 'error');
    }
  }

  const blocks = buildLessonBlocks(input.subject, app.lessonLanguage);
  const durationSteps = allocateDurations(input.duration, blocks.length);

  const plan = blocks.map((block, index) => ({
    index: index + 1,
    title: block.title,
    minutes: durationSteps[index],
    description: enrichBlockText(block.text, input, student),
    emotion: 0
  }));

  $('lessonMeta').innerHTML = `
    <strong>${escapeHtml(input.subject)}</strong> · ${escapeHtml(input.level)} · ${input.duration} min · ${escapeHtml(app.lessonLanguage)}
    <br>${app.lessonLanguage === 'SK' ? 'Téma' : 'Topic'}: ${escapeHtml(input.topic || '—')} · ${app.lessonLanguage === 'SK' ? 'Žiak' : 'Student'}: ${escapeHtml(student.name || 'Student')}
  `;

  renderTimeline(plan);
  renderChecklists(student.checklistTemplate);
  renderEmotionMap(plan);
  app.currentPlan = plan;
  app.currentModelOutput = null;
  renderAdaptationBlock(null);
  setValidationMessage('Plan generated. Fill the required checklist fields before saving.', 'ok');
}

function renderLesson() {
  return generateLessonPlan();
}

function enrichBlockText(baseText, input, student) {
  const extras = [];
  if (input.goal) extras.push(`Goal: ${input.goal}.`);
  if (student.notes) extras.push(`Student note: ${student.notes}.`);
  if (input.notes) extras.push(`Teacher note: ${input.notes}.`);
  return `${baseText} ${extras.join(' ')}`.trim();
}

function allocateDurations(totalMinutes, stepCount) {
  const safeTotal = Math.max(stepCount * 5, Math.round(totalMinutes / 5) * 5);
  const durations = Array(stepCount).fill(5);
  let remaining = safeTotal - durations.reduce((sum, value) => sum + value, 0);
  const order = stepCount === 4 ? [1, 2, 0, 3] : Array.from({ length: stepCount }, (_, index) => index);
  let pointer = 0;
  while (remaining > 0) {
    durations[order[pointer % order.length]] += 5;
    remaining -= 5;
    pointer += 1;
  }
  return durations;
}

function renderTimeline(plan) {
  const wrap = $('lessonTimeline');
  wrap.innerHTML = '';
  plan.forEach((block, index) => {
    const row = document.createElement('div');
    row.className = 'timeline-step';
    row.dataset.index = String(index);
    row.dataset.emotion = String(block.emotion ?? 0);
    row.innerHTML = `
      <div class="timeline-no">${escapeHtml(String(block.minutes))}</div>
      <div>
        <h4 contenteditable="true" spellcheck="false">${escapeHtml(block.title)}</h4>
        <p contenteditable="true" spellcheck="false">${escapeHtml(block.description)}</p>
        <div class="timeline-controls">
          <label>Engagement</label>
          <select data-emotion-select>
            <option value="2">😄 great</option>
            <option value="1">🙂 good</option>
            <option value="0" selected>😐 neutral</option>
            <option value="-1">😕 hard</option>
            <option value="-2">😣 very hard</option>
          </select>
        </div>
      </div>
    `;
    const minutesEl = row.querySelector('.timeline-no');
    if (minutesEl) minutesEl.dataset.minutes = String(block.minutes || 0);
    const select = row.querySelector('[data-emotion-select]');
    select.value = String(block.emotion ?? 0);
    select.addEventListener('change', () => {
      row.dataset.emotion = select.value;
      block.emotion = Number(select.value);
      renderEmotionMap(plan);
    });
    row.querySelector('h4').addEventListener('input', () => {
      block.title = row.querySelector('h4').innerText.trim();
    });
    row.querySelector('p').addEventListener('input', () => {
      block.description = row.querySelector('p').innerText.trim();
    });
    wrap.appendChild(row);
  });
}

function renderChecklists(template) {
  const preContainer = $('preChecklist');
  const postContainer = $('postChecklist');
  preContainer.innerHTML = '';
  postContainer.innerHTML = '';
  const preFragment = renderChecklistBlock(template.pre, 'pre');
  const postFragment = renderChecklistBlock(template.post, 'post');
  if (preFragment) preContainer.appendChild(preFragment);
  if (postFragment) postContainer.appendChild(postFragment);

  // Bind score range displays for any dynamically created ranges
  [preContainer, postContainer].forEach(container => {
    if (!container) return;
    container.querySelectorAll('input[type="range"]').forEach(input => {
      const display = input.parentElement.querySelector('[data-score-value]');
      if (display) display.textContent = String(input.value);
      input.addEventListener('input', () => {
        if (display) display.textContent = String(input.value);
      });
    });
  });
}

function renderChecklistBlock(questions, prefix) {
  const frag = document.createDocumentFragment();
  questions.forEach(question => {
    const required = question.required ? true : false;
    const wrap = document.createElement('div');
    wrap.className = 'check-item';
    if (question.type === 'checkbox') {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.checkId = question.id;
      input.dataset.required = required ? '1' : '0';
      label.appendChild(input);
      label.insertAdjacentHTML('beforeend', ' ' + escapeHtml(question.text) + (required ? ' <span class="required">*</span>' : ''));
      wrap.appendChild(label);
    } else if (question.type === 'choice') {
      const label = document.createElement('label');
      label.innerHTML = `${escapeHtml(question.text)} ${required ? '<span class="required">*</span>' : ''}`;
      const row = document.createElement('div');
      row.className = 'check-item-row';
      const input = document.createElement('select');
      input.dataset.checkId = question.id;
      input.dataset.required = required ? '1' : '0';
      input.innerHTML = ['<option value="">Choose…</option>']
        .concat((question.options || checklistChoiceOptions).map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`))
        .join('');
      row.appendChild(input);
      wrap.appendChild(label);
      wrap.appendChild(row);
    } else {
      const label = document.createElement('label');
      label.innerHTML = `${escapeHtml(question.text)} ${required ? '<span class="required">*</span>' : ''}`;
      const row = document.createElement('div');
      row.className = 'check-item-row';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = 0;
      input.max = 10;
      input.step = 1;
      input.value = 5;
      input.dataset.checkId = question.id;
      input.dataset.required = required ? '1' : '0';
      const strong = document.createElement('strong');
      strong.setAttribute('data-score-value', '');
      strong.textContent = String(input.value);
      row.appendChild(input);
      row.appendChild(strong);
      wrap.appendChild(label);
      wrap.appendChild(row);
    }
    frag.appendChild(wrap);
  });
  return frag;
}

function renderEmotionMap(plan) {
  const wrap = $('emotionMap');
  wrap.innerHTML = plan.map(block => {
    const mood = emotionToMood(block.emotion ?? 0);
    const color = moodColor(block.emotion ?? 0);
    return `
      <div class="emotion-cell" style="background:${color}">
        <div class="emotion-emoji">${mood.emoji}</div>
        <div class="emotion-name">${escapeHtml(block.title)}</div>
      </div>
    `;
  }).join('');
}

// Checklist editor functions
function renderChecklistEditor() {
  const editor = document.getElementById('checklistEditor');
  if (!editor) return;
  const student = activeStudent();
  const preList = $('checklistPreList');
  const postList = $('checklistPostList');
  if (!preList || !postList) return;
  preList.innerHTML = '';
  postList.innerHTML = '';
  const tpl = sanitizeChecklist(student.checklistTemplate || defaultChecklist);
  student.checklistTemplate = tpl;

  tpl.pre.forEach(item => {
    const row = document.createElement('div');
    row.className = 'checklist-row';
    row.innerHTML = `<div class="checklist-text">${escapeHtml(item.text)} ${item.required ? '<span class="required">*</span>' : ''} <small class="muted">${escapeHtml(item.type)}</small></div><div><button data-remove-id="${escapeHtml(item.id)}" data-remove-section="pre" class="secondary small">Remove</button></div>`;
    preList.appendChild(row);
  });
  tpl.post.forEach(item => {
    const row = document.createElement('div');
    row.className = 'checklist-row';
    row.innerHTML = `<div class="checklist-text">${escapeHtml(item.text)} ${item.required ? '<span class="required">*</span>' : ''} <small class="muted">${escapeHtml(item.type)}</small></div><div><button data-remove-id="${escapeHtml(item.id)}" data-remove-section="post" class="secondary small">Remove</button></div>`;
    postList.appendChild(row);
  });

  // bind remove buttons
  editor.querySelectorAll('button[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove-id');
      const section = btn.getAttribute('data-remove-section');
      removeChecklistItem(section, id);
    });
  });

  // bind add button
  const addBtn = document.getElementById('btnAddChecklistItem');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.addEventListener('click', addChecklistItemFromEditor);
    addBtn.dataset.bound = '1';
  }
}

function addChecklistItemFromEditor() {
  const section = $('checklistSection').value || 'pre';
  const type = $('checklistType').value || 'checkbox';
  const text = $('checklistText').value.trim() || 'Question';
  const required = !!$('checklistRequired').checked;
  const student = activeStudent();
  const id = uid('q');
  const item = {
    id,
    text,
    type: ['checkbox', 'score', 'choice'].includes(type) ? type : 'score',
    required,
    options: type === 'choice' ? checklistChoiceOptions : undefined
  };
  student.checklistTemplate = student.checklistTemplate || { pre: [], post: [] };
  student.checklistTemplate[section] = student.checklistTemplate[section] || [];
  student.checklistTemplate[section].push(item);
  student.checklistTemplate = sanitizeChecklist(student.checklistTemplate);
  saveState();
  $('checklistText').value = '';
  updateChecklistJsonFromEditor();
  renderChecklistEditor();
  setValidationMessage('Checklist item added.', 'ok');
}

function removeChecklistItem(section, id) {
  const student = activeStudent();
  if (!student.checklistTemplate || !Array.isArray(student.checklistTemplate[section])) return;
  student.checklistTemplate[section] = student.checklistTemplate[section].filter(it => it.id !== id);
  student.checklistTemplate = sanitizeChecklist(student.checklistTemplate);
  saveState();
  updateChecklistJsonFromEditor();
  renderChecklistEditor();
  setValidationMessage('Checklist item removed.', 'ok');
}

function updateChecklistJsonFromEditor() {
  const student = activeStudent();
  $('studentChecklistJson').value = JSON.stringify(student.checklistTemplate || defaultChecklist, null, 2);
}

// Adaptation block rendering
function renderAdaptationBlock(source) {
  const summary = $('adaptationSummary');
  const bullets = $('adaptationBullets');
  if (!summary || !bullets) return;
  const adapt = source?.adaptation || source?.adaptation?.summary ? source.adaptation : null;
  if (source && source.adaptation) {
    summary.textContent = source.adaptation.summary || '—';
    bullets.innerHTML = Array.isArray(source.adaptation.bullets) ? `<ul>${source.adaptation.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '';
    return;
  }
  // if passed a lesson session
  if (source && source.adaptation && typeof source.adaptation === 'object') {
    summary.textContent = source.adaptation.summary || '—';
    bullets.innerHTML = Array.isArray(source.adaptation.bullets) ? `<ul>${source.adaptation.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '';
    return;
  }
  // fallback
  summary.textContent = 'No adaptation suggestions yet. Generate or save a lesson to see recommendations.';
  bullets.innerHTML = '';
}

function emotionToMood(value) {
  const score = Number(value || 0);
  if (score >= 2) return { emoji: '😄', label: 'great' };
  if (score === 1) return { emoji: '🙂', label: 'good' };
  if (score === 0) return { emoji: '😐', label: 'neutral' };
  if (score === -1) return { emoji: '😕', label: 'hard' };
  return { emoji: '😣', label: 'very hard' };
}

function moodColor(value) {
  const score = Number(value || 0);
  if (score >= 2) return '#dcfce7';
  if (score === 1) return '#dbeafe';
  if (score === 0) return '#f3f4f6';
  if (score === -1) return '#fee2e2';
  return '#fecaca';
}

function collectChecklistAnswers(prefix) {
  const block = prefix === 'pre' ? $('preChecklist') : $('postChecklist');
  const answers = [];
  const questions = activeChecklist()[prefix];
  questions.forEach(question => {
    const input = block.querySelector(`[data-check-id="${CSS.escape(question.id)}"]`);
    if (!input) return;
    if (question.type === 'checkbox') {
      answers.push({ id: question.id, value: input.checked });
    } else if (question.type === 'choice') {
      answers.push({ id: question.id, value: input.value });
    } else {
      answers.push({ id: question.id, value: Number(input.value) });
    }
  });
  return answers;
}

function validateBeforeSave() {
  clearValidation();
  const errors = [];
  if (!app.activeStudentId) {
    errors.push('Select a student first.');
  }
  const studentName = $('studentName').value.trim();
  if (!studentName) {
    errors.push('Student name is required.');
    $('studentName').classList.add('invalid');
  }

  const questionBlocks = [
    { prefix: 'pre', container: $('preChecklist') },
    { prefix: 'post', container: $('postChecklist') }
  ];

  questionBlocks.forEach(({ prefix, container }) => {
    activeChecklist()[prefix].forEach(question => {
      if (!question.required) return;
      const input = container.querySelector(`[data-check-id="${CSS.escape(question.id)}"]`);
      if (!input) return;
      if (question.type === 'checkbox' && !input.checked) {
        errors.push(`${prefix.toUpperCase()}: ${question.text}`);
        input.classList.add('invalid');
      }
      if (question.type === 'choice' && !String(input.value || '').trim()) {
        errors.push(`${prefix.toUpperCase()}: ${question.text}`);
        input.classList.add('invalid');
      }
      if (question.type === 'score' && String(input.value) === '') {
        errors.push(`${prefix.toUpperCase()}: ${question.text}`);
        input.classList.add('invalid');
      }
    });
  });

  if (errors.length) {
    setValidationMessage(`Please fill required fields:\n• ${errors.slice(0, 4).join('\n• ')}`, 'error');
    return false;
  }

  setValidationMessage('Ready to save. Required fields are complete.', 'ok');
  return true;
}

function clearValidation() {
  document.querySelectorAll('.invalid').forEach(element => element.classList.remove('invalid'));
}

function setValidationMessage(message, kind = 'ok') {
  const box = $('validationBox');
  box.className = `validation-box ${kind}`;
  box.textContent = message;
}

function saveLesson() {
  if (!validateBeforeSave()) return;

  const student = activeStudent();
  const input = currentLessonInput();
  const plan = Array.from($('lessonTimeline').querySelectorAll('.timeline-step')).map((row, index) => ({
    index: index + 1,
    title: row.querySelector('h4').innerText.trim(),
    description: row.querySelector('p').innerText.trim(),
    minutes: Number(row.querySelector('.timeline-no').dataset.minutes || row.querySelector('.timeline-no').innerText || 0),
    emotion: Number(row.dataset.emotion || 0)
  }));
  const preAnswers = collectChecklistAnswers('pre');
  const postAnswers = collectChecklistAnswers('post');
  const insights = deriveSessionInsights({
    output: app.currentModelOutput,
    plan,
    preAnswers,
    postAnswers,
    input,
    student
  });
  const session = {
    id: uid('sess'),
    createdAt: new Date().toISOString(),
    studentId: student.id,
    studentName: student.name,
    input,
    plan,
    preAnswers,
    postAnswers,
    sessionScore: insights.sessionScore,
    modelMode: app.modelMode,
    modelPreset: app.modelPreset,
    checklistInterpretation: insights.checklistInterpretation,
    adaptation: insights.adaptation,
    riskFlags: insights.riskFlags,
    teacherNote: insights.teacherNote
  };

  app.state.lessons.unshift(session);
  app.state.lessons = app.state.lessons.slice(0, MAX_SESSIONS);
  app.activeLessonId = session.id;
  saveState();
  renderHistory();
  renderAnalytics();
  updateMetrics();
  setValidationMessage('Lesson saved to history.', 'ok');
  // Show adaptation from saved session under the lesson plan area
  renderAdaptationBlock(session);
  // Switch to history so the user sees the saved session
  setActiveTab('history');
}

function renderHistory() {
  const wrap = $('historyList');
  const detail = $('historyDetail');
  const lessons = app.state.lessons.filter(lesson => lesson.studentId === app.activeStudentId);
  wrap.innerHTML = '';

  if (!lessons.length) {
    wrap.innerHTML = '<div class="muted">No saved lessons yet.</div>';
    detail.innerHTML = '<div class="muted">Select a student and save a lesson to see history.</div>';
    return;
  }

  lessons.forEach(lesson => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-item';
    item.innerHTML = `
      <div class="dot"></div>
      <div>
        <strong>${escapeHtml(lesson.input.topic || lesson.input.subject)}</strong>
        <span>${new Date(lesson.createdAt).toLocaleString()} · Score ${lesson.sessionScore}/10</span>
      </div>
      <div class="list-pill">Open</div>
    `;
    item.addEventListener('click', () => showHistoryDetail(lesson.id));
    wrap.appendChild(item);
  });

  const selected = app.activeLessonId ? lessons.find(lesson => lesson.id === app.activeLessonId) : lessons[0];
  if (selected) showHistoryDetail(selected.id);
}

function showHistoryDetail(lessonId) {
  app.activeLessonId = lessonId;
  const lesson = app.state.lessons.find(item => item.id === lessonId);
  if (!lesson) return;
  const adaptationBullets = Array.isArray(lesson.adaptation?.bullets) ? lesson.adaptation.bullets : [];
  const riskFlags = Array.isArray(lesson.riskFlags) ? lesson.riskFlags : [];
  const detail = $('historyDetail');
  const adaptationSummary = lesson.adaptation?.summary || buildAdaptationNote(lesson);
  detail.innerHTML = `
    <div class="detail-line"><strong>${escapeHtml(lesson.input.subject)}</strong> · ${escapeHtml(lesson.input.level)} · ${lesson.input.duration} min</div>
    <div class="detail-line"><strong>Topic:</strong> ${escapeHtml(lesson.input.topic || '—')}</div>
    <div class="detail-line"><strong>Goal:</strong> ${escapeHtml(lesson.input.goal || '—')}</div>
    <div class="detail-line"><strong>Score:</strong> ${lesson.sessionScore}/10</div>
    <div class="detail-line"><strong>Language:</strong> ${escapeHtml(lesson.input?.language || app.lessonLanguage || 'EN')}</div>
    <div class="detail-line"><strong>Model mode:</strong> ${escapeHtml(lesson.modelMode || 'mock')}</div>
    <div class="detail-line"><strong>Model preset:</strong> ${escapeHtml(lesson.modelPreset || '—')}</div>
    <div class="detail-line"><strong>Checklist interpretation:</strong> ${escapeHtml(lesson.checklistInterpretation?.pre || '—')} ${escapeHtml(lesson.checklistInterpretation?.post ? `• ${lesson.checklistInterpretation.post}` : '')}</div>
    <div class="detail-line"><strong>Next lesson:</strong> ${escapeHtml(adaptationSummary || '—')}</div>
    ${adaptationBullets.length ? `<div class="detail-line"><strong>Recommendations:</strong><ul>${adaptationBullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul></div>` : ''}
    ${riskFlags.length ? `<div class="detail-line"><strong>Risk flags:</strong><ul>${riskFlags.map(flag => `<li>${escapeHtml(flag)}</li>`).join('')}</ul></div>` : ''}
    <div class="detail-line"><strong>Teacher note:</strong> ${escapeHtml(lesson.teacherNote || '—')}</div>
  `;
}

function renderAnalytics() {
  const lessons = app.state.lessons.filter(lesson => lesson.studentId === app.activeStudentId);
  const scores = lessons.map(lesson => Number(lesson.sessionScore || 0));
  const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const min = scores.length ? Math.min(...scores) : 0;
  $('analyticsStats').innerHTML = `
    <div class="stat-card"><div class="v">${lessons.length}</div><div class="l">Lessons for this student</div></div>
    <div class="stat-card"><div class="v">${avg}/10</div><div class="l">Average score</div></div>
    <div class="stat-card"><div class="v">${min}/10</div><div class="l">Lowest score</div></div>
    <div class="stat-card"><div class="v">${max}/10</div><div class="l">Highest score</div></div>
  `;
  renderSparkline($('analyticsSparkline'), scores);
  renderSparkline($('dashboardSparkline'), scores);
  renderHealthSummary(lessons);
}

function renderHealthSummary(lessons) {
  const box = $('healthSummary');
  if (!lessons.length) {
    box.innerHTML = '<div class="muted">No history yet. Save a lesson to see checklist health.</div>';
    return;
  }
  const last = lessons[0];
  box.innerHTML = `
    <div class="mini-item"><strong>Last score: ${last.sessionScore}/10</strong><span>${new Date(last.createdAt).toLocaleString()}</span></div>
    <div class="mini-item"><strong>Checklist filled</strong><span>Pre: ${last.preAnswers.length} answers, Post: ${last.postAnswers.length} answers</span></div>
    <div class="mini-item"><strong>Model mode</strong><span>${escapeHtml(last.modelMode || 'mock')}</span></div>
  `;
}

function renderSparkline(container, values) {
  if (!container) return;
  if (!values.length) {
    container.innerHTML = '<div class="muted">No data yet.</div>';
    return;
  }
  const width = Math.max(220, values.length * 40);
  const height = 120;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 10);
  const scaleX = values.length === 1 ? 0 : width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = Math.round(index * scaleX);
    const y = Math.round(height - ((value - min) / ((max - min) || 1)) * (height - 12) - 6);
    return `${x},${y}`;
  }).join(' ');
  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="sparkline-svg">
      <polyline points="${points}" fill="none" stroke="#0f766e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>
    </svg>
  `;
}

function renderDashboard() {
  const student = activeStudent();
  $('currentStudentSummary').innerHTML = `
    <div class="detail-line"><strong>Name:</strong> ${escapeHtml(student.name || '—')}</div>
    <div class="detail-line"><strong>Subject:</strong> ${escapeHtml(student.subject || '—')}</div>
    <div class="detail-line"><strong>Notes:</strong> ${escapeHtml(student.notes || '—')}</div>
    <div class="detail-line"><strong>Checklist:</strong> ${student.checklistTemplate?.pre?.length || 0} pre / ${student.checklistTemplate?.post?.length || 0} post items</div>
  `;
}

function copyLessonPlan() {
  const text = buildPlainTextPlan();
  (async () => {
    try {
      await navigator.clipboard.writeText(text);
      setValidationMessage('Plan copied to clipboard.', 'ok');
    } catch (err) {
      setValidationMessage('Copy failed: use manual copy.', 'error');
    }
  })();
}

function buildPlainTextPlan() {
  const student = activeStudent();
  const input = currentLessonInput();
  const rows = [`Lesson for ${student.name}`, `${input.subject} · ${input.level} · ${input.duration} min`, `Language: ${input.language}`, `Topic: ${input.topic}`, `Goal: ${input.goal}`, ''];
  Array.from($('lessonTimeline').querySelectorAll('.timeline-step')).forEach((row, index) => {
    rows.push(`${index + 1}. ${row.querySelector('h4').innerText.trim()} (${row.querySelector('.timeline-no').innerText} min)`);
    rows.push(`   ${row.querySelector('p').innerText.trim()}`);
  });
  return rows.join('\n');
}

// Build adaptation note from session if model didn't provide one
function buildAdaptationNote(lesson) {
  if (!lesson) return 'No data yet.';
  const post = Array.isArray(lesson.postAnswers) ? lesson.postAnswers : [];
  const pre = Array.isArray(lesson.preAnswers) ? lesson.preAnswers : [];
  const emotions = Array.isArray(lesson.plan) ? lesson.plan.map(b => Number(b.emotion || 0)) : [];

  const numeric = arr => arr.map(a => answerValueToScore(a.value)).filter(value => Number.isFinite(value));
  const postNums = numeric(post);
  const preNums = numeric(pre);
  const avg = arr => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const avgPost = avg(postNums);
  const avgPre = avg(preNums);
  const avgEmotion = emotions.length ? emotions.reduce((s, v) => s + v, 0) / emotions.length : null;

  const notes = [];
  if (avgPost !== null) {
    if (avgPost >= 8) notes.push('Post-lesson understanding was high — increase challenge next time.');
    else if (avgPost >= 6) notes.push('Understanding is adequate — keep similar structure.');
    else notes.push('Low post score — simplify the topic or slow the pace next lesson.');
  }
  if (avgPre !== null && avgPost !== null) {
    const delta = avgPost - avgPre;
    if (delta > 1) notes.push('Learning gain observed — good progression.');
    else if (delta < -1) notes.push('Engagement dropped — topic may have been too difficult.');
  }
  if (avgEmotion !== null) {
    if (avgEmotion < -0.5) notes.push('Emotion map shows struggle — add more scaffolding and encouragement.');
    else if (avgEmotion > 1) notes.push('Student was positively engaged — consider adding stretch tasks.');
  }
  if (!notes.length) return 'Not enough data to generate adaptation advice.';
  return notes.join(' ');
}

function printPlan() {
  window.print();
}

function toggleModelMode(mode) {
  app.modelMode = mode;
  localStorage.setItem(MODEL_MODE_KEY, mode);
  if (mode === 'test' && !app.modelBaseUrl) {
    app.modelBaseUrl = 'http://127.0.0.1:8000/v1/chat/completions';
    localStorage.setItem(MODEL_BASE_URL_KEY, app.modelBaseUrl);
    const baseUrlField = $('modelBaseUrl');
    if (baseUrlField) baseUrlField.value = app.modelBaseUrl;
  }
  updateMetrics();
  const preset = modelPresetCatalog[app.modelPreset] || modelPresetCatalog['qwen2.5-3b-instruct'];
  $('modelNotes').innerHTML = mode === 'real'
    ? '<div class="detail-line">Real mode enabled. The app will call your backend API and expect JSON lesson plans.</div><div class="detail-line">Use the prompt on this tab as the system prompt.</div>'
    : mode === 'test'
      ? `<div class="detail-line">Test mode is active with <strong>${escapeHtml(preset.label)}</strong>.</div><div class="detail-line">${escapeHtml(preset.note)}</div>`
      : '<div class="detail-line">Mock mode is active. The app uses local templates and deterministic lesson generation.</div>';
}

function setTestModelPreset(presetKey) {
  if (!modelPresetCatalog[presetKey]) return;
  app.modelPreset = presetKey;
  localStorage.setItem(MODEL_PRESET_KEY, presetKey);
  if (app.modelMode === 'test') {
    toggleModelMode('test');
  } else {
    updateMetrics();
  }
}

function saveModelConfig() {
  app.modelProvider = $('modelProvider')?.value || 'openai-compatible';
  app.modelBaseUrl = ($('modelBaseUrl')?.value || '').trim();
  app.modelApiKey = ($('modelApiKey')?.value || '').trim();
  localStorage.setItem(MODEL_PROVIDER_KEY, app.modelProvider);
  localStorage.setItem(MODEL_BASE_URL_KEY, app.modelBaseUrl);
  localStorage.removeItem(MODEL_API_KEY);
  setValidationMessage('Model config saved.', 'ok');
}

function fillDemoData() {
  if (!confirm('Load demo students and lesson history?')) return;
  const first = activeStudent();
  const secondId = uid('stu');
  app.state.students = [
    first,
    {
      id: secondId,
      name: 'Anna M.',
      subject: 'Math',
      notes: 'Needs a slower pace and more practice.',
      checklistTemplate: {
        pre: defaultChecklist.pre,
        post: defaultChecklist.post
      },
      createdAt: new Date().toISOString()
    }
  ].map(student => ({ ...student, checklistTemplate: sanitizeChecklist(student.checklistTemplate) }));
  app.activeStudentId = first.id;
  app.state.selectedStudentId = first.id;
  app.state.lessons = [
    {
      id: uid('sess'),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      studentId: first.id,
      studentName: first.name,
      input: { subject: 'English', topic: 'Present Simple', goal: 'Practice core concept', level: 'A2', duration: 45, notes: 'Demo note' },
      plan: [],
      preAnswers: [{ id: 'pre-1', value: true }, { id: 'pre-2', value: 6 }],
      postAnswers: [{ id: 'post-1', value: true }, { id: 'post-2', value: 7 }],
      sessionScore: 7,
      modelMode: 'mock'
    },
    {
      id: uid('sess'),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      studentId: first.id,
      studentName: first.name,
      input: { subject: 'English', topic: 'Past Simple', goal: 'Use past tense in short answers', level: 'A2', duration: 45, notes: 'Demo note' },
      plan: [],
      preAnswers: [{ id: 'pre-1', value: true }, { id: 'pre-2', value: 7 }],
      postAnswers: [{ id: 'post-1', value: true }, { id: 'post-2', value: 8 }],
      sessionScore: 8,
      modelMode: 'mock'
    }
  ];
  saveState();
  syncStudentForm();
  renderStudentList();
  renderLesson();
  renderHistory();
  renderAnalytics();
  renderDashboard();
  updateMetrics();
}

function resetApp() {
  if (!confirm('Reset all local app data?')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(MODEL_MODE_KEY);
  localStorage.removeItem(MODEL_PRESET_KEY);
  localStorage.removeItem(LESSON_LANGUAGE_KEY);
  localStorage.removeItem(MODEL_PROVIDER_KEY);
  localStorage.removeItem(MODEL_BASE_URL_KEY);
  localStorage.removeItem(MODEL_API_KEY);
  app.state = defaultState();
  app.activeStudentId = app.state.selectedStudentId;
  app.activeLessonId = null;
  app.modelMode = 'mock';
  app.modelPreset = 'qwen2.5-3b-instruct';
  app.lessonLanguage = 'EN';
  app.modelProvider = 'openai-compatible';
  app.modelBaseUrl = '';
  app.modelApiKey = '';
  syncStudentForm();
  syncSubjectLessonFields($('lessonSubject')?.value || 'English');
  renderStudentList();
  renderLesson();
  renderHistory();
  renderAnalytics();
  renderDashboard();
  updateMetrics();
  setValidationMessage('App reset complete.', 'ok');
}

function syncSubjectLessonFields(subject, { preserveValues = false } = {}) {
  const config = getSubjectLessonConfig(subject);
  applySubjectTheme(subject);
  applySubjectLessonCatalog(subject);
  if (!preserveValues) {
    const topic = $('lessonTopic');
    const goal = $('lessonGoal');
    const level = $('lessonLevel');
    if (topic) topic.value = config.defaultTopic;
    if (goal) goal.value = config.defaultGoal;
    if (level) level.value = config.levels[0];
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
  });

  $('studentSearch').addEventListener('input', event => renderStudentList(event.target.value));
  $('btnAddStudent').addEventListener('click', addStudent);
  $('btnSaveStudent').addEventListener('click', saveStudent);
  $('btnResetChecklist').addEventListener('click', resetStudentChecklist);

  $('lessonDuration').addEventListener('input', updateDurationLabel);
  $('btnGenerateLesson').addEventListener('click', generateLessonPlan);
  $('btnQuickLesson').addEventListener('click', generateLessonPlan);
  $('btnQuickLesson').addEventListener('click', () => { generateLessonPlan(); setActiveTab('lesson'); });
  $('btnCopyPlan').addEventListener('click', copyLessonPlan);
  $('btnPrintPlan').addEventListener('click', printPlan);
  $('btnSaveLesson').addEventListener('click', saveLesson);
  $('btnDemoData').addEventListener('click', () => confirmInline('btnDemoData', fillDemoData));
  $('btnReset').addEventListener('click', () => confirmInline('btnReset', resetApp));

  $('btnCopyPrompt').addEventListener('click', () => {
    navigator.clipboard?.writeText(realModelPrompt).then(() => {
      setValidationMessage('Prompt copied.', 'ok');
    });
  });
  $('btnUseTestModel').addEventListener('click', () => toggleModelMode('test'));
  $('btnSaveModelConfig').addEventListener('click', saveModelConfig);
  $('btnUseMock').addEventListener('click', () => toggleModelMode('mock'));
  const btnExport = document.getElementById('btnExport');
  if (btnExport) btnExport.addEventListener('click', exportAllData);
  const btnImport = document.getElementById('btnImport');
  if (btnImport) btnImport.addEventListener('click', importAllData);
  const btnToggleJson = document.getElementById('btnToggleChecklistJson');
  if (btnToggleJson) btnToggleJson.addEventListener('click', toggleChecklistJsonVisibility);
  const btnModelMock = document.getElementById('btnModelMock');
  const btnModelTest = document.getElementById('btnModelTest');
  const btnModelReal = document.getElementById('btnModelReal');
  if (btnModelMock) btnModelMock.addEventListener('click', () => setSimpleModelMode('mock'));
  if (btnModelTest) btnModelTest.addEventListener('click', () => setSimpleModelMode('test'));
  if (btnModelReal) btnModelReal.addEventListener('click', () => setSimpleModelMode('real'));

  $('lessonSubject').addEventListener('change', () => {
    syncSubjectLessonFields($('lessonSubject').value);
    renderLesson();
  });
  $('lessonLanguage').addEventListener('change', () => {
    app.lessonLanguage = $('lessonLanguage').value || 'EN';
    localStorage.setItem(LESSON_LANGUAGE_KEY, app.lessonLanguage);
    renderLesson();
    renderDashboard();
  });
  $('lessonTopic').addEventListener('change', renderLesson);
  $('lessonLevel').addEventListener('change', renderLesson);
  $('lessonGoal').addEventListener('input', renderLesson);
  $('lessonNotes').addEventListener('input', renderLesson);
  $('studentName').addEventListener('input', () => {
    $('lessonStudentLabel').textContent = $('studentName').value.trim() || 'Student';
  });
  const btnChatSend = $('btnChatSend');
  if (btnChatSend) btnChatSend.addEventListener('click', sendChatMessage);
  const chatInput = $('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
  }
  const btnClearChat = $('btnClearChat');
  if (btnClearChat) btnClearChat.addEventListener('click', clearChat);

  $('modelPreset').addEventListener('change', () => setTestModelPreset($('modelPreset').value));
  $('modelProvider').addEventListener('change', () => saveModelConfig());
  $('modelBaseUrl').addEventListener('change', () => saveModelConfig());
  $('modelApiKey').addEventListener('change', () => saveModelConfig());

  document.getElementById('realModelPrompt').value = realModelPrompt;
  updateModelUiFromState();
  applySubjectTheme($('lessonSubject')?.value || 'English');
  $('modelNotes').innerHTML = '<div class="detail-line">Mock mode is active. The app uses local lesson templates.</div><div class="detail-line">Switch to real mode only when your backend returns lesson JSON with blocks, adaptation and risk flags.</div>';
  $('modelNotes').innerHTML = '<div class="detail-line">Mock mode is active. The app uses local lesson templates.</div><div class="detail-line">Switch to real mode only when your backend returns lesson JSON with blocks, checklist interpretation, adaptation, risk flags, and a teacher note.</div>';
}

function init() {
  app.activeStudentId = app.state.selectedStudentId;
  syncStudentForm();
  syncSubjectLessonFields($('lessonSubject')?.value || 'English');
  renderStudentList();
  updateDurationLabel();
  generateLessonPlan();
  renderHistory();
  renderAnalytics();
  renderDashboard();
  updateMetrics();
  setActiveTab('dashboard');
  updateChatContextBar();
  updateModelUiFromState();
  toggleModelMode(app.modelMode);
  bindEvents();
}

// Inline confirmation helper (avoids blocking native confirm)
function confirmInline(buttonId, action) {
  const btn = $(buttonId);
  if (!btn) {
    action();
    return;
  }
  if (btn.dataset.confirming === '1') {
    btn.dataset.confirming = '0';
    btn.classList.remove('btn-danger');
    btn.textContent = btn.dataset.originalText || btn.textContent;
    action();
    return;
  }
  btn.dataset.confirming = '1';
  btn.dataset.originalText = btn.textContent;
  btn.textContent = 'Click again to confirm';
  btn.classList.add('btn-danger');
  setTimeout(() => {
    if (btn.dataset.confirming === '1') {
      btn.dataset.confirming = '0';
      btn.classList.remove('btn-danger');
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }, 3500);
}

// Export / import app state
function exportAllData() {
  const data = JSON.stringify(app.state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teacher-support-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setValidationMessage('Export started.', 'ok');
}

function importAllData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        app.state = normalizeState(parsed);
        app.activeStudentId = app.state.selectedStudentId;
        saveState();
        syncStudentForm();
        renderStudentList();
        renderLesson();
        renderHistory();
        renderAnalytics();
        renderDashboard();
        updateMetrics();
        setValidationMessage('Import complete.', 'ok');
      } catch (err) {
        setValidationMessage('Import failed: invalid file.', 'error');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// ── Chat ──────────────────────────────────────────────────────────────────────

const chatSystemPrompt = `You are an expert teaching assistant embedded in TeacherSupport Studio.
You help teachers and private tutors with lesson planning, student management, and modern educational strategies.
You have access to the current student's profile and recent lesson history (provided in each message).
Be concise, practical, and specific. Prioritize actionable advice over theory.
When suggesting activities, tie them to the student's subject and level.
If you don't have enough context, ask one clarifying question.
Respond in the same language the user writes in.`;

const chatMockReplies = {
  warm: [
    'A good warm-up for {subject} is a 5-minute recall activity. Ask the student to write 3 things they remember from the last lesson — it activates memory and shows you where gaps remain.',
    'Try a quick "what do you know about..." opener. It takes 2-3 minutes and reveals misconceptions before you dive in.',
  ],
  motivation: [
    'When motivation drops, shorten the task length rather than the difficulty. A 5-minute sprint feels achievable; a 30-minute block can feel overwhelming.',
    'For {name}, try linking the topic to something they mentioned in their profile notes. Personal relevance is a strong motivator.',
    'Add an element of choice — let the student pick which task to start with. Autonomy boosts engagement even in small doses.',
  ],
  checklist: [
    'Your post-checklist data shows whether understanding was achieved. If scores are consistently below 6, the pace is too fast — either shorten the topic or add a mid-lesson check.',
    'Pre-checklist readiness scores under 5 are a signal to start with review rather than new content.',
  ],
  progress: [
    'Looking at the lesson history for {name}: the score trend gives a clear picture of whether the current approach is working. A plateau usually means it\'s time to vary the activity type.',
    'If scores are improving steadily, you can start introducing slightly harder tasks — stretch goals are safe when confidence is up.',
  ],
  plan: [
    'A solid 45-minute {subject} lesson for {level}: 10 min warm-up → 15 min guided practice with 2 examples → 12 min independent task → 8 min exit ticket. Adjust the guided block based on the pre-checklist score.',
    'For {subject} at {level}: keep the first block short and low-stakes. Students need a few minutes to shift mental gears before they can absorb new content.',
  ],
  default: [
    'Based on {name}\'s profile and recent sessions: focus the next lesson on consolidating the current topic before introducing anything new.',
    'Good question. For {subject} at this level, I\'d recommend keeping tasks under 15 minutes each and using the exit ticket to decide whether to move on.',
    'One practical approach: after each block, ask the student to rate their understanding 1–5. It takes 10 seconds and gives you real-time data without formal testing.',
    'Modern education research consistently shows that spaced practice beats massed practice. Instead of one long session per week, two shorter sessions produce better long-term retention.',
  ]
};

function chatMockResponse(text) {
  const student = activeStudent();
  const name = student?.name || 'the student';
  const subject = student?.subject || 'this subject';
  const lessons = app.state.lessons.filter(l => l.studentId === app.activeStudentId);
  const level = lessons[0]?.input?.level || 'their level';

  const lower = text.toLowerCase();
  let pool;
  if (/warm.?up|starter|opener/i.test(lower)) pool = chatMockReplies.warm;
  else if (/motiv|engag|boring|distract/i.test(lower)) pool = chatMockReplies.motivation;
  else if (/checklist|score|answer/i.test(lower)) pool = chatMockReplies.checklist;
  else if (/progress|trend|improv|history/i.test(lower)) pool = chatMockReplies.progress;
  else if (/plan|lesson|structur|block/i.test(lower)) pool = chatMockReplies.plan;
  else pool = chatMockReplies.default;

  const template = pool[Math.floor(Math.random() * pool.length)];
  return template
    .replace(/{name}/g, name)
    .replace(/{subject}/g, subject)
    .replace(/{level}/g, level);
}

async function requestChatFromModel(messages) {
  const endpoint = resolveModelEndpoint();
  if (!endpoint) return null;
  const body = {
    model: app.modelPreset,
    messages: [
      { role: 'system', content: chatSystemPrompt },
      ...messages
    ],
    temperature: 0.5
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(app.modelApiKey ? { Authorization: `Bearer ${app.modelApiKey}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Chat model error: ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

function buildChatContext() {
  const student = activeStudent();
  const lessons = app.state.lessons
    .filter(l => l.studentId === app.activeStudentId)
    .slice(0, 3)
    .map(l => ({ topic: l.input?.topic, subject: l.input?.subject, score: l.sessionScore, date: l.createdAt }));
  return `Student context: name=${student.name}, subject=${student.subject}, notes=${student.notes || 'none'}. Recent lessons: ${JSON.stringify(lessons)}.`;
}

function appendChatBubble(role, text, typing = false) {
  const wrap = $('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}${typing ? ' typing' : ''}`;
  const body = document.createElement('div');
  body.className = 'bubble-body';
  body.textContent = text;
  div.appendChild(body);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

async function sendChatMessage() {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = '';

  appendChatBubble('user', text);

  if (!app.chatHistory) app.chatHistory = [];
  app.chatHistory.push({ role: 'user', content: buildChatContext() + '\n\nUser: ' + text });

  const typingEl = appendChatBubble('assistant', '…', true);

  try {
    let reply;
    if (app.modelMode === 'test' || app.modelMode === 'real') {
      reply = await requestChatFromModel(app.chatHistory);
    }
    if (!reply) reply = chatMockResponse(text);

    typingEl.remove();
    const bubble = appendChatBubble('assistant', '');
    bubble.querySelector('.bubble-body').innerHTML = reply
      .split('\n')
      .map(line => line.startsWith('- ') || line.startsWith('• ')
        ? `<li>${escapeHtml(line.slice(2))}</li>`
        : escapeHtml(line))
      .join('<br>')
      .replace(/(<li>.*<\/li>)+/g, match => `<ul>${match}</ul>`);

    app.chatHistory.push({ role: 'assistant', content: reply });
    if (app.chatHistory.length > 20) app.chatHistory = app.chatHistory.slice(-20);
  } catch (err) {
    typingEl.remove();
    appendChatBubble('assistant', 'Something went wrong. ' + (err.message || 'Please try again.'));
  }
}

function clearChat() {
  app.chatHistory = [];
  const wrap = $('chatMessages');
  wrap.innerHTML = '';
  appendChatBubble('assistant', 'Chat cleared. How can I help you?');
}

function updateChatContextBar() {
  const el = $('chatStudentName');
  if (el) el.textContent = activeStudent()?.name || 'Student';
}

window.addEventListener('DOMContentLoaded', init);
