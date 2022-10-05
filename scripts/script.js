var urlHash = ""
var themeCounter = 0
var editor = ace.edit("editor");
var modelist = ace.require("ace/ext/modelist");
let pop = document.getElementById("popup")
let newButton = document.getElementById("new")
let saveButton = document.getElementById("save")
let langMode = document.getElementById("lang-mode")
let popupTxt = document.getElementById("popup-text")
let themeButton = document.getElementById("theme-mode")
let linkToFile = document.getElementById("link-to-file")
let defaultFilenameInput = document.getElementById("default")
let syncModeElement = document.getElementById("sync-mode")
let editorTextInput = document.getElementsByClassName("ace_text-input")[0]
let context = {id: "", mode: ""}
let container = {}
let previouslyClickedItem = null

editor.setOptions({
    fontSize: "13pt",
    copyWithEmptySelection: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
});
editor.setTheme("ace/theme/one_dark");

// resolve icon source
function resolveIconSource(mode) {
    return `assets/${mode.toLowerCase()}.png`
}

// mode from filename
var nameInputTimer = null;
function fileNameUpdate(updatedName, id) {
    if (nameInputTimer) {
        clearTimeout(nameInputTimer)
    }
    nameInputTimer = setTimeout(function() {
        syncModeElement.style.display = "none"
        var mode = modelist.getModeForPath(updatedName).mode;
        editor.session.setMode(mode);
        let resolvedLang = String(mode).split("/")[2].toUpperCase()
        langMode.innerHTML = resolvedLang
        container[id].mode = mode
        context.mode = mode
        context.id = id
        let icon = document.getElementById(`${id}-icon`)
        icon.src = resolveIconSource(resolvedLang)
        container[id].name = updatedName
        saveButton.click()
        syncModeElement.style.display = "flex"
    }, 1000)
}

// handle sidebar item click
function sidebarItemClick(id) {
    if (previouslyClickedItem != null) {
        previouslyClickedItem.style.border = "none"
    }
    let item = document.getElementById(id)
    previouslyClickedItem = item
    item.style.border = "1px solid blue"
    context.id = id.split("-")[0]
    let info = container[context.id]
    context.mode = info.mode
    editor.setValue(info.value)
    editor.session.setMode(info.mode)
    langMode.innerHTML = info.mode.split("/")[2].toUpperCase()
}

// loding tasks
window.onload = function() {
    let isForked = document.getElementById("forkinfo")
    if (isForked.innerHTML == "") {
        context.id = "default"
        context.mode = "ace/mode/text"
        editor.session.setMode(context.mode);
        urlHash = Math.random().toString(36).substring(5, 9) + Math.random().toString(36).substring(4, 8)
        document.getElementById("link-to-file").innerHTML = window.location.href + urlHash
        defaultFilenameInput.value = ""
        container[context.id] = {mode: context.mode, value: "", name: "untitled"}
    } else {
        fetch(`/base/${isForked.innerHTML}`)
        .then(response => response.json())
        .then(data => {
            if (data) {
                let currentDeafult = document.getElementById("default-item")
                currentDeafult.remove()
                let sidebar = document.getElementsByClassName("sidebar")[0]
                for (let key in data) {
                    if (key == "key") {
                        continue
                    }
                    let info = data[key]
                    let item = document.createElement("div")
                    item.className = "sidebar-item"
                    item.id = `${key}-item`
                    item.onclick = function() {sidebarItemClick(`${key}-item`)}
                    let icon = document.createElement("img")
                    let resolvedLang = String(info.mode).split("/")[2]
                    icon.src = resolveIconSource(resolvedLang)
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
            }
            let defaultItem = document.getElementById("default-item")
            defaultItem.click()
            saveButton.click()
        })
    }
}

// theme button callback
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

// save button callback
saveButton.addEventListener("click", function() {
    syncModeElement.style.display = "none"
    fetch(`/base/${urlHash}`, {method: "POST", body: JSON.stringify(container)})
    .then(function(response) {
        if (response.status == 200) {
            syncModeElement.style.display = "flex"
        }
    })
})

// new button callback
newButton.addEventListener("click", function() {
    let inputId = Math.random().toString(36).substring(5, 9) + Math.random().toString(36).substring(4, 8)
    let sidebarItem = document.createElement("div")
    sidebarItem.className = "sidebar-item"
    sidebarItem.id = `${inputId}-item`
    sidebarItem.addEventListener("click", function() {
        sidebarItemClick(sidebarItem.id)
    })
    let langIcon = document.createElement("img")
    langIcon.id = `${inputId}-icon`
    langIcon.src = `/assets/script.png`
    let itemInput = document.createElement("input")
    itemInput.id = inputId
    itemInput.placeholder = "untitled"
    itemInput.type = "text"
    itemInput.value = ""
    itemInput.addEventListener("input", function() {
        fileNameUpdate(itemInput.value, itemInput.id)
    })
    sidebarItem.appendChild(langIcon)
    sidebarItem.appendChild(itemInput)
    document.getElementsByClassName("sidebar")[0].appendChild(sidebarItem)
    editor.setValue("")
    context.id = inputId
    context.mode = "ace/mode/text"
    editor.session.setMode(context.mode);
    langMode.innerHTML = context.mode.split("/")[2].toUpperCase()
    container[inputId] = {mode: "ace/mode/text", value: "", name: "untitled"}
    sidebarItem.click()
})

// file drop callback
function dropHandler(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.items) {
        [...ev.dataTransfer.items].forEach((item, _) => {
            let inputId = Math.random().toString(36).substring(5, 9) + Math.random().toString(36).substring(4, 8)
            if (item.kind === 'file') {
                const file = item.getAsFile();
                var mode = modelist.getModeForPath(file.name).mode;
                editor.session.setMode(mode);
                let resolvedLang = mode.split("/")[2].toUpperCase()
                langMode.innerHTML = resolvedLang
                var reader = new FileReader();
                reader.onload = function(e) {
                    let sidebarItem = document.createElement("div")
                    sidebarItem.className = "sidebar-item"
                    sidebarItem.id = `${inputId}-item`
                    sidebarItem.addEventListener("click", function() {
                        sidebarItemClick(sidebarItem.id)
                    })
                    let langIcon = document.createElement("img")
                    langIcon.id = `${inputId}-icon`
                    langIcon.src = resolveIconSource(resolvedLang)
                    let itemInput = document.createElement("input")
                    itemInput.id = inputId
                    itemInput.type = "text"
                    itemInput.value = file.name
                    itemInput.addEventListener("input", function() {
                        fileNameUpdate(itemInput.value, itemInput.id)
                    })
                    sidebarItem.appendChild(langIcon)
                    sidebarItem.appendChild(itemInput)
                    document.getElementsByClassName("sidebar")[0].appendChild(sidebarItem)
                    container[inputId] = {mode: mode, value: e.target.result, name: file.name}
                }
                reader.readAsText(file);
            }
        })
        saveButton.click();
    }
}

// overrided default file drop event
function dragOverHandler(ev) {
    ev.preventDefault();
}

// handle code paste
editor.on("paste", function() {
    saveButton.click()
})

// bottom bar link callback
linkToFile.addEventListener("click", function() {
    saveButton.click()
    navigator.clipboard.writeText(linkToFile.innerHTML)
    let fileLinkElement = document.getElementById("link-to-file")
    fileLinkElement.style.color = "#00b0ff"
    setTimeout(function() {
        fileLinkElement.style.color = "white"
    }, 1000)
})

// listen for edit events
var timer = null;
editorTextInput.addEventListener("keyup", function() {
    syncModeElement.style.display = "none"
    let filenameInput = document.getElementById(context.id)
    container[context.id] = {mode: context.mode, value: editor.getValue(), name: filenameInput.value}
    if (timer) {
        clearTimeout(timer);
    }
    timer = setTimeout(function() {
        saveButton.click()
    }, 1000);
})

// check if delete key is pressed
document.addEventListener("keydown", function(e) {
    if (e.key == "Delete" && context.id != "default") {
        let sidebarItem = document.getElementById(`${context.id}-item`)
        if (sidebarItem) {
            sidebarItem.remove()
            delete container[context.id]
            context.id = "default"
            let defaultItem = document.getElementById("default-item")
            defaultItem.click()
            saveButton.click()
        }
    }
});