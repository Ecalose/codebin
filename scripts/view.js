var editor = ace.edit("editor")
editor.setReadOnly(true)
var langMode = document.getElementById("lang-mode")
let sidebar = document.getElementById("master-sidebar")
let previouslyClickedItem = null
let container = {}

editor.setOptions({
    fontSize: "13pt",
    copyWithEmptySelection: true,
    showPrintMargin: false,
})
editor.setTheme("ace/theme/one_dark");

function resolveIconSource(mode) {
    let srcName = mode.split("/")[2].toLowerCase()
    return `/modes/${srcName}.png`
}

function sidebarItemClick(id) {
    if (previouslyClickedItem != null) {
        previouslyClickedItem.style.border = "none"
    }
    let item = document.getElementById(id)
    previouslyClickedItem = item
    item.style.border = "1px solid #1c4ce4"
    let resolvedId = id.split("-")[0]
    let info = container[resolvedId]
    editor.setValue(info.value)
    editor.session.setMode(info.mode)
    langMode.innerHTML = info.mode.split("/")[2].toUpperCase()
}

function showCode(code) {
    fetch(`/base/${code}`)
    .then(function(response) {
        if (response.status == 200) {
            return response.json()
        } else {
            let popupText = document.getElementById("popup-text")
            popupText.innerHTML = "File not found :("
            let modal = document.getElementById("popup")
            modal.style.display = "flex"
            setTimeout(function() {
                modal.style.display = "none"
                window.location.href = "/"
            }, 900)
        }
    })
    .then(function(data) {
        let iniItemId = null;
        for (let key in data) {
            let info = data[key]
            let item = document.createElement("div")
            item.className = "item"
            item.id = `${key}-item`
            if (iniItemId == null) {
                iniItemId = item.id
            }
            item.onclick = function() {sidebarItemClick(`${key}-item`)}
            let icon = document.createElement("img")
            icon.src = resolveIconSource(info.mode)
            icon.id = `${key}-icon`
            let nameInput = document.createElement("input")
            nameInput.type = "text"
            nameInput.placeholder = "untitled"
            nameInput.value = info.name
            nameInput.id = `${key}`
            nameInput.readOnly = true
            item.appendChild(icon)
            item.appendChild(nameInput)
            sidebar.appendChild(item)
            container[key] = info
        }
        document.getElementById(iniItemId).click()
    })
}

window.onload = function() {
    let code = window.location.pathname.replace("/", "")
    let title = document.getElementsByTagName("title")[0]
    title.innerHTML = `codebin/${code}`
    showCode(code)
}

let copyCodeButton = document.getElementById("copy-code")
copyCodeButton.addEventListener("click", function() {
    text = editor.getValue()
    navigator.clipboard.writeText(text)
    .then(function() {
        showToast("Snippet copied to clipboard", toastGreen)
    })
})

themeCounter = 0
let themeButton = document.getElementById("theme-mode")
themeButton.addEventListener("click", function() {
    var themes = ace.require("ace/ext/themelist").themes
    themes.reverse()
    let th = themes[themeCounter].theme
    editor.setTheme(th)
    if (themeCounter == themes.length - 1) {
        themeCounter = 0
    } else {
        themeCounter++
    }
    themeButton.innerHTML = themes[themeCounter].caption
})

let toast = document.querySelector(".toast")
const toastGreen = "#27ab5a"
const toastRed = "#c32c59"
function showToast(innerText, color="#1c4ce4") {
    toast.innerHTML = `<p>${innerText}</p>`
    toast.style.backgroundColor = color
    toast.style.display = "flex"
    setTimeout(function() {
        toast.style.display = "none"
    }, 3000)
}
