var editor = ace.edit("main");
var modelist = ace.require("ace/ext/modelist");
let editorStatusElem = document.querySelector("#editor-status")
let editorLinkElem = document.querySelector("#editor-link")
let editorModeElem = document.querySelector("#editor-mode")
let editorThemeElem = document.querySelector("#editor-theme")
let sidebar = document.querySelector(".sidebar")
let toast = document.querySelector(".toast")
let defaultId = null;
let container = {}
let urlHash = ""
let sidebarItemArray = []
let context = {id: null, mode: null}
const maxFileSize = 400 * 1024
const primaryBlue = "#1c4ce4"
const toastGreen = "#27ab5a"
const toastRed = "#c32c59"

editor.setOptions({
    fontSize: "13pt",
    copyWithEmptySelection: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
});
editor.setTheme("ace/theme/one_dark");


window.addEventListener("DOMContentLoaded", () => {
    urlHash = generateRandomId()
    context.id = generateRandomId()
    context.mode = "ace/mode/text"
    defaultId = context.id
    container[context.id] = {
        mode: context.mode, 
        value: "", 
        name: "untitled", 
        parent: urlHash
    }
    let sidebarItem = generateSidebarItem(context.id, modeToLabel(context.mode), "")
    sidebar.appendChild(sidebarItem)
    sidebarItemArray.push(sidebarItem)
    editorThemeElem.innerHTML = `<i class="fa-solid fa-palette"></i> One Dark`;
    editorLinkElem.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${window.location.href + urlHash}`;
    sidebarItem.click()
});

function modeToLabel(mode) {
    return String(mode).split("/")[2]
}

function updateLangMode(mode) {
    editorModeElem.innerHTML = `<i class="fa-solid fa-code-commit"> ${modeToLabel(mode).toUpperCase()}`;
}

function generateRandomId() {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
}

function resolveIconSource(mode) {
    return `/modes/${mode.toLowerCase()}.png`
}

function generateSidebarItem(id, mode, filename) {
    let sidebarItem = document.createElement("div")
    sidebarItem.className = "item"
    sidebarItem.id = `item-${id}`;
    sidebarItem.addEventListener("click", function() {
        sidebarItemClick(`item-${id}`)
    })
    let langIcon = document.createElement("img")
    langIcon.id = `icon-${id}`
    langIcon.src = resolveIconSource(mode)
    let filenameElem = document.createElement("p")
    filenameElem.id = id
    filenameElem.placeholder = "untitled"
    filenameElem.type = "text"
    filenameElem.value = filename
    filenameElem.contentEditable = true
    filenameElem.spellcheck = false
    filenameElem.style.outline = "none"
    filenameElem.addEventListener("input", function() {
        fileNameUpdate(filenameElem.value, filenameElem.id)
    })
    let icon = document.createElement("i")
    icon.className = "fa-solid fa-paper-plane"
    icon.addEventListener("click", function() {
        navigator.clipboard.writeText(`${window.location.href}file/${id}`)
        showToast("File Link copied to clipboard", toastGreen)
    })
    sidebarItem.appendChild(langIcon)
    sidebarItem.appendChild(filenameElem)
    sidebarItem.appendChild(icon)
    return sidebarItem
}

let nameInputTimer = null;
function fileNameUpdate(name, id) {
    if (nameInputTimer) {
        clearTimeout(nameInputTimer)
    }
    nameInputTimer = setTimeout(function() {
        editorStatusElem.style.display = "none"
        var mode = modelist.getModeForPath(name).mode;
        editor.session.setMode(mode);
        updateLangMode(mode)
        container[id].mode = mode
        container[id].name = name
        context.mode = mode
        context.id = id
        let icon = document.getElementById(`icon-${id}`)
        icon.src = resolveIconSource(modeToLabel(mode))
        saveButton.click()
        editorStatusElem.style.display = "flex"
    }, 1000)
}

let previouslyClickedItem = null;
function sidebarItemClick(itemId) {
    if (previouslyClickedItem != null) {
        previouslyClickedItem.style.border = "none"
    }
    previouslyClickedItem = document.getElementById(itemId)
    previouslyClickedItem.style.border = `1px solid rgba(245, 222, 179, 0.095)`
    context.id = itemId.split("-")[0]
    let info = container[context.id]
    context.mode = info.mode
    editor.session.setMode(info.mode)
    updateLangMode(info.mode)
    editor.setValue(info.value)
    saveButton.click()
}

var themeCounter = 0
editorThemeElem.addEventListener("click", function() {
    var themes = ace.require("ace/ext/themelist").themes
    themes.reverse()
    let th = themes[themeCounter].theme
    editor.setTheme(th)
    if (themeCounter == themes.length - 1) {
        themeCounter = 0
    } else {
        themeCounter++
    }
    editorThemeElem.innerHTML = `<i class="fa-solid fa-palette"></i> ${themes[themeCounter].caption}`
})

let saveButton = document.getElementById("save")
saveButton.addEventListener("click", function() {
    editorStatusElem.style.display = "none"
    let bodyString = JSON.stringify(container[context.id])
    let encoder = new TextEncoder();
    if (encoder.encode(bodyString).length < maxFileSize) {
        fetch(`/api/bins/${context.id}`, {method: "POST", body: bodyString})
        .then(function(response) {
            if (response.status == 200) {
                editorStatusElem.style.display = "flex"
            }
        })
    } else {
        showToast("File size exceeded 400KB", toastRed)
    }
})

let newButton = document.getElementById("new")
newButton.addEventListener("click", function() {
    let inputId = generateRandomId()
    let sidebarItem = generateSidebarItem(inputId, "text", "")
    sidebarItemArray.push(sidebarItem)
    sidebar.appendChild(sidebarItem)
    document.getElementById(inputId).focus()
    container[inputId] = {
        mode: "ace/mode/text", 
        value: "", 
        name: "untitled", 
        parent: urlHash
    }
    sidebarItem.click()
})

function dropHandler(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.items) {
        [...ev.dataTransfer.items].forEach((item, _) => {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                var reader = new FileReader();
                reader.onload = function(e) {
                    let newId = generateRandomId()
                    let mode = modelist.getModeForPath(file.name).mode;
                    container[newId] = {
                        mode: mode,
                        name: file.name, 
                        parent: urlHash,
                        value: e.target.result
                    }
                    let sidebarItem = generateSidebarItem(newId, modeToLabel(mode), file.name)
                    sidebarItemArray.push(sidebarItem)
                    sidebar.appendChild(sidebarItem)
                    sidebarItem.click()
                }
                reader.readAsText(file);
            }
        })
    }
}

let editorWindow = document.querySelector(".editor")
editorWindow.ondrop = (e) => {
    dropHandler(e)
}
editorWindow.ondragover = (e) => {
    e.preventDefault()
}

// bottom bar link callback
editorLinkElem.addEventListener("click", () => {
    saveButton.click()
    navigator.clipboard.writeText(linkToFile.innerText)
    showToast("Link copied to clipboard", toastGreen)
})

// listen for edit events
let autosaveTimer = null;
let editorTextInput = document.getElementsByClassName("ace_text-input")[0]
editorTextInput.addEventListener("keydown", function(e) {
    editorStatusElem.style.display = "none"
    if (autosaveTimer) {
        clearTimeout(autosaveTimer);
    }
    autosaveTimer = setTimeout(function() {
        container[context.id].value = editor.getValue() 
        updateTotalSize()
        saveButton.click()
    }, 1000);
})

// check keydown event
document.addEventListener("keydown", function(e) {
    // if delete key pressed
    if (e.key == "Delete") {
        trashButton.click()
    }
    // if arrow keys pressed
    if (e.key == "ArrowUp" || e.key == "ArrowDown") {
        let sidebarItem = document.getElementById(`${context.id}-item`)
        if (sidebarItem) {
            let index = sidebarItemArray.indexOf(sidebarItem)
            if (e.key == "ArrowUp" && index > 0) {
                index--
            } else if (e.key == "ArrowUp" && index == 0) {
                index = sidebarItemArray.length - 1
            } else if (e.key == "ArrowDown" && index == sidebarItemArray.length - 1) {
                index = 0
            } else if (e.key == "ArrowDown" && index < sidebarItemArray.length - 1) {
                index++
            } else {
                return
            }
            sidebarItemArray[index].click()
        }
    }
});

// handle delete button
let trashButton = document.getElementById("trash")
trashButton.addEventListener("click", function() {
    if (context.id != defaultId) {
        let sidebarItem = document.getElementById(`${context.id}-item`)
        if (sidebarItem) {
            let index = sidebarItemArray.indexOf(sidebarItem)
            sidebarItemArray.splice(index, 1)
            sidebarItem.remove()
            delete container[context.id]
            if (index == sidebarItemArray.length) {
                index--
            }
            fetch(`/api/bins/${context.id}`, {method: "DELETE"})
            sidebarItemArray[index].click()
        }
    } else {
        showToast("cannot delete default file", "red")
    }
})

// handle file upload
let filesElement = document.getElementById("files")
filesElement.addEventListener("change", function() {
    let file = filesElement.files[0]
    let mode = modelist.getModeForPath(file.name).mode;
    editor.session.setMode(mode);
    updateLangMode(mode)
    var reader = new FileReader();
    reader.onload = function(e) {
        let newId = generateRandomId()
        let sidebarItem = generateSidebarItem(newId, modeToLabel(mode), file.name)
        sidebarItemArray.push(sidebarItem)
        sidebar.appendChild(sidebarItem)
        container[newId] = {
            mode: mode, 
            name: file.name, 
            parent: urlHash,
            value: e.target.result
        }
        sidebarItem.click()
    }
    reader.readAsText(file);
})

//handle upload button
let uploadButton = document.getElementById("upload")
uploadButton.addEventListener("click", function() {
    filesElement.click()
})

function showToast(innerText, color="#1c4ce4") {
    toast.innerHTML = `<p>${innerText}</p>`
    toast.style.backgroundColor = color
    toast.style.display = "flex"
    setTimeout(function() {
        toast.style.display = "none"
    }, 3000)
}
