var container = {}
var editor = ace.edit("editor")
editor.setReadOnly(true)
var langMode = document.getElementById("lang-mode")
let sidebar = document.getElementById("master-sidebar")
let previouslyClickedItem = null

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
    item.style.border = "1px solid blue"
    let resolvedId = id.split("-")[0]
    let info = container[resolvedId]
    editor.setValue(info.value)
    editor.session.setMode(info.mode)
    langMode.innerHTML = info.mode.split("/")[2].toUpperCase()
}

function showCode(code) {
    fetch(`/base/file/${code}`)
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
            }, 3000)
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
    let code = window.location.pathname.split("/")[2]
    let title = document.getElementsByTagName("title")[0]
    title.innerHTML = `file/${code}`
    showCode(code)
}

copyCodeButton = document.getElementById("copy-code")
copyCodeButton.addEventListener("click", function() {
    text = editor.getValue()
    navigator.clipboard.writeText(text)
    .then(function() {
        let popupText = document.getElementById("popup-text")
        popupText.innerHTML = "Copied to Clipboard"
        let modal = document.getElementById("popup")
        modal.style.display = "flex"
        setTimeout(function() {
            modal.style.display = "none"
        }, 900)
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