const pageParams = {
    'data': getUrlParam('data', undefined)
};

let questions = [];
let keys = [];
let correct = 0;
let count = 0;
let started = false;
let stopped = false;
let pass = '0';

let jsonData;
async function fetchConfig() {
    try {
        const response = await fetch('./config.json');
        jsonData = await response.json();
    } catch (e) {
        console.error(`[fetchConfig] code: ${e.status}; message: ${e}`);
    }
}

let yamlData;
async function fetchData(yamlPth) {
    try {
        const response = await fetch(yamlPth)
            .then(res => res.blob())
            .then(blob => blob.text());
        yamlData = await jsyaml.load(response);
    } catch (e) {
        console.error(`[fetchData] code: ${e.status}; message: ${e}`);
    }
}

function getUrlParam(parameter, defaultvalue) {
    var urlparam = (window.location.href.indexOf(parameter) > - 1) ? getUrlVars()[parameter] : defaultvalue;
    return (urlparam !== undefined) ? urlparam : defaultvalue;
}

function getUrlVars() {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function set_element_innerHTML(cls, data) {
    document.querySelectorAll(`.${cls}`).forEach((e) => {
        e.innerHTML = data;
    });
}

let divMainContent;
let btnStartStop;
let btnReset;
let timerCounter;

document.addEventListener('DOMContentLoaded', () => {

    divMainContent = document.querySelector('.main-content');
    btnReset = document.querySelector('.vvi-btn-reset');
    btnStartStop = document.querySelector('.vvi-btn-stop');
    timerCounter = document.getElementById('time-counter');

    fetchConfig().then(() => {
        console.log(jsonData);

        let testId = jsonData.data[pageParams.data];
        if (testId == undefined) {
            console.error(`Тест с ID = ${pageParams.data} не найден в файле конфигурации.`);
            return;
        }
        fetchData(`${jsonData.yaml_path}/${pageParams.data}.yaml`).then(() => {
            count = yamlData.time;
            set_element_innerHTML('test-count', yamlData.count);
            set_element_innerHTML('vvi-test-title', yamlData.code);
            set_element_innerHTML('test-limit', yamlData.limit);
            set_element_innerHTML('test-time', count);
            timerCounter.innerHTML = `${count}:00`;
            questions = getRandomQuestions(yamlData.data, yamlData.count);
            btnStartStop.onclick = startTest;
            btnStartStop.disabled = false;
            btnReset.disabled = true;
            btnReset.onclick = resetTest;
            document.querySelector('.vvi-loader').remove();
            document.querySelector('.vvi-content').style.display = 'flex';
        });
    });
});


function startTest() {
    document.querySelector('.test-info-card').style.display = 'none';
    btnStartStop.innerHTML = 'Стоп';
    btnStartStop.onclick = stopTest;
    renderQuestions();
    timerStart();
}

function stopTest() {
    if (started) {
        stopped = true;
        btnStartStop.disabled = true;
        btnReset.disabled = false;
        checkAnswers();
    }
}

function getRandomQuestions(array, cnt) {
    if ((cnt <= 0) || (cnt > array.length)) {
        cnt = array.length;
    }
    let result = [];
    for (var i = 0; i < cnt; i++) {
        let rndIdx = Math.floor(Math.random() * array.length);
        result.push(array.splice(rndIdx, 1)[0]);
    }
    return result;
}

function renderQuestions() {
    questions.forEach((obj, idx) => {
        try {
            divMainContent.append(getCheckRadioCard(idx, obj));
        }
        catch (error) {
            divMainContent.append(ErrorCard(idx, obj));
        }
    });
}

function resetTest(event) {
    started = false;
    stopped = false;
    btnStartStop.disabled = false;
    btnReset.disabled = true;
    document.querySelectorAll(".question-card").forEach((card) => {
        card.remove();
    });
    document.querySelector('.main-content').scrollTop = Math.pow(10, 10);
    if (yamlData.alwaysnew) {
        questions = getRandomQuestions(yamlData.data, yamlData.count);
    } else {
        questions.forEach((v, qi) => {
            v.opt.forEach((e, oi) => {
                v.opt[oi] = keys[qi][oi] == '1' ? `*${e}` : e;
            });
            v.opt = shuffle(v.opt);
        });
    }
    keys = [];
    renderQuestions();
    timerStart();
}

function timerStart() {
    if (started) { return };
    stopped = false;
    var start_time = new Date();
    var stop_time = start_time.setMinutes(start_time.getMinutes() + count);
    var countdown = setInterval(function () {
        var now = new Date().getTime();
        var remain = stop_time - now;
        var min = Math.floor((remain % (1000 * 60 * 60)) / (1000 * 60));
        var sec = Math.floor((remain % (1000 * 60)) / 1000);
        sec = sec < 10 ? "0" + sec : sec;
        if (remain <= 0) {
            clearInterval(countdown);
            stopTest();
            started = false;
        } else if (stopped) {
            clearInterval(countdown);
            started = false;
        } else {
            timerCounter.innerHTML = min + ":" + sec;
        }
    }, 1000);
    started = true;
}

function ErrorCard(idx, object) {
    return Object.assign(document.createElement("div"), {
        id: idx,
        className: "card question-card shadow-sm mb-3",
        innerHTML: `<div class="card-header row mx-0"><h5 class="m-0">[<span style="color:red;">ошибка</span>] Неверный шаблон вопроса (# ${object.dbnum}).</h5></div><div class="card-body">Пожалуйста сообщите об этой ошибке в техническую поддержку</div>`
    });
}

function getCheckRadioCard(idx, object) {

    let card = Object.assign(document.createElement("div"), {
        className: 'card question-card shadow-sm mb-3'
    });
    card.setAttribute("dbnum", object.dbnum);
    card.append(
        Object.assign(document.createElement("div"), {
            className: 'card-header row mx-0 bg-success p-1 text-dark bg-opacity-10',
            innerHTML: `<h5 class="m-0"><i class="check-mark"></i><span>${idx + 1}. ${object.head}</span></h5>`
        })
    );
    let card_body = Object.assign(document.createElement("div"), {
        className: 'card-body'
    });
    let key = '';
    object.opt.forEach((e, i) => {
        key += e.charAt(0) === '*' ? '1' : '0';
        object.opt[i] = e.charAt(0) === '*' ? e.slice(1) : e;
    });
    keys.push(key);
    let input_type = key.indexOf('1') == key.lastIndexOf('1') ? "radio" : "checkbox";
    object.opt.forEach((v, i) => {
        key += v.charAt(0) === '*' ? '1' : '0';
        let form_check = Object.assign(document.createElement("div"), {
            id: `form-check-${idx}-${i}`,
            className: 'form-check',
            name: `q${idx}`
        });
        let input = Object.assign(document.createElement("input"), {
            className: 'form-check-input flex-shrink-0',
            type: input_type,
            name: `${input_type}-q${idx}`,
            id: `q${idx}-${i}`
        });
        let form_label = Object.assign(document.createElement("label"), {
            className: 'form-check-label d-flex gap-3',
            innerHTML: `<span class="pt-1 form-checked-content">${v}</span>`
        });
        form_label.setAttribute('for', `q${idx}-${i}`);
        form_check.append(input, form_label);
        card_body.append(form_check);
    });
    card.append(card_body)
    return card;
}

function showAlert() {
    let modalId = (correct >= jsonData.limit) ? 'answerOK' : 'answerFAIL';
    let modal = document.getElementById(modalId);
    Object.assign(modal.querySelector('h4.right-answers'), {
        innerHTML: `Вы ответили верно на ${correct} из ${keys.length}`
    });
    new bootstrap.Modal(modal).show();
}

function checkAnswers() {
    correct = 0;
    qarr = [];
    aarr = [];
    let result = [];
    let qcards = document.querySelectorAll(".question-card");
    qcards.forEach((o, i) => {
        qarr.push(o.getAttribute('dbnum'));
        let s = "";
        o.querySelectorAll('.form-check-input').forEach((e, y) => {
            s += e.checked ? '1' : '0';
            if ((e.checked) || (keys[i][y] == '1')) {
                e.labels[0].style.color = 'green';
                e.labels[0].style.fontSize = '12pt';
                e.labels[0].style.fontWeight = 'bold';
                if (keys[i][y] != '1') {
                    e.labels[0].style.color = 'red';
                }
            }
            e.disabled = true;
        });
        result.push(s);
        if (s == keys[i]) {
            correct++;
            aarr.push(1);
        }
        else {
            aarr.push(0);
        }
    });
    document.querySelectorAll(".check-mark").forEach((e, i) => {
        e.className += (aarr[i] == 1) ? ' ri-check-fill' : ' ri-close-fill';
        e.style.color = (aarr[i] == 1) ? 'green' : 'red';
        e.style.fontSize = '24px';
        e.style.display = 'unset';
    });
    showAlert();
}
