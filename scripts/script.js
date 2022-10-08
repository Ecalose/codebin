var editor = ace.edit("editor");
var modelist = ace.require("ace/ext/modelist");
let langMode = document.getElementById("lang-mode")
let syncModeElement = document.getElementById("sync-mode")
let sidebar = document.getElementById("master-sidebar")
let container = {}
let sidebarItemArray = []
let context = {id: "", mode: ""}
const maxFileSize = 5242880
let currentTotalSize = 0

editor.setOptions({
    fontSize: "13pt",
    copyWithEmptySelection: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
});
editor.setTheme("ace/theme/one_dark");

// mode to uppercase ext
function modeToLabel(mode) {
    return String(mode).split("/")[2]
}

// check and update total size
function updateTotalSize() {
    const encoder = new TextEncoder();
    let currentSize = encoder.encode(JSON.stringify(container)).length;
    let percentage = (currentSize / maxFileSize) * 100
    let sizeBar = document.getElementById("sizebar")
    if (percentage > 100) {
        sizeBar.style.backgroundColor = "#ff004ca0"
    } else {
        sizeBar.style.backgroundColor = "rgba(4, 113, 66, 0.632)"
    }
    document.getElementById("current-size").innerHTML = `${percentage.toFixed(5)}%`
    if (currentSize > maxFileSize) {
        return false
    }
    currentTotalSize = currentSize
    return true
}

// generate random id
function generateRandomId() {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
}

// resolve icon source
function resolveIconSource(mode) {
    return `assets/${mode.toLowerCase()}.png`
}

// generate sidebar item
function generateSidebarItem(id, mode, filename) {
    let sidebarItem = document.createElement("div")
    sidebarItem.className = "item"
    sidebarItem.id = `${id}-item`
    sidebarItem.addEventListener("click", function() {
        sidebarItemClick(sidebarItem.id)
    })
    let langIcon = document.createElement("img")
    langIcon.id = `${id}-icon`
    langIcon.src = `/assets/${mode.toLowerCase()}.png`
    let itemInput = document.createElement("input")
    itemInput.id = id
    itemInput.placeholder = "untitled"
    itemInput.type = "text"
    itemInput.value = filename
    itemInput.addEventListener("input", function() {
        fileNameUpdate(itemInput.value, itemInput.id)
    })
    sidebarItem.appendChild(langIcon)
    sidebarItem.appendChild(itemInput)
    return sidebarItem
}

// mode from filename
let nameInputTimer = null;
function fileNameUpdate(updatedName, id) {
    if (nameInputTimer) {
        clearTimeout(nameInputTimer)
    }
    nameInputTimer = setTimeout(function() {
        syncModeElement.style.display = "none"
        var mode = modelist.getModeForPath(updatedName).mode;
        editor.session.setMode(mode);
        let resolvedLang = modeToLabel(mode).toUpperCase()
        langMode.innerHTML = resolvedLang
        container[id].mode = mode
        context.mode = mode
        context.id = id
        let icon = document.getElementById(`${id}-icon`)
        icon.src = resolveIconSource(resolvedLang)
        container[id].name = updatedName
        updateTotalSize()
        saveButton.click()
        syncModeElement.style.display = "flex"
    }, 1000)
}

// handle sidebar item click
let previouslyClickedItem = null;
function sidebarItemClick(id) {
    if (previouslyClickedItem != null) {
        previouslyClickedItem.style.border = "none"
    }
    let item = document.getElementById(id)
    previouslyClickedItem = item
    item.style.border = "1px solid rgb(3, 5, 247)"
    context.id = id.split("-")[0]
    let info = container[context.id]
    context.mode = info.mode
    editor.setValue(info.value)
    editor.session.setMode(info.mode)
    langMode.innerHTML = modeToLabel(info.mode).toUpperCase()
}

// loding tasks
let urlHash = ""
window.onload = function() {
    context.id = "default"
    context.mode = "ace/mode/text"
    editor.session.setMode(context.mode);
    urlHash = generateRandomId()
    document.getElementById("link-to-file").innerHTML = window.location.href + urlHash
    container[context.id] = {mode: context.mode, value: "", name: "untitled"}
    updateTotalSize()
    let sidebarItem = generateSidebarItem(context.id, modeToLabel(context.mode), "")
    sidebar.appendChild(sidebarItem)
    sidebarItemArray.push(sidebarItem)
    sidebarItemClick(`${context.id}-item`)
}

// theme button callback
var themeCounter = 0
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

// save button callback
let saveButton = document.getElementById("save")
saveButton.addEventListener("click", function() {
    syncModeElement.style.display = "none"
    if (updateTotalSize()) {
        fetch(`/base/${urlHash}`, {method: "POST", body: JSON.stringify(container)})
        .then(function(response) {
            if (response.status == 200) {
                syncModeElement.style.display = "flex"
            }
        })
    } else {
        let popup = document.getElementById("popup")
        let popupText = document.getElementById("popup-text")
        popupText.innerHTML = "Total size exceeded 5MB :("
        popup.style.display = "flex"
        setTimeout(function() {
            popupText.innerHTML = "Copied"
            popup.style.display = "none"
        }, 2000)
    }
})

// new button callback
let newButton = document.getElementById("new")
newButton.addEventListener("click", function() {
    let inputId = generateRandomId()
    let sidebarItem = generateSidebarItem(inputId, "text", "")
    sidebarItemArray.push(sidebarItem)
    document.getElementsByClassName("sidebar")[0].appendChild(sidebarItem)
    editor.setValue("")
    context.id = inputId
    context.mode = "ace/mode/text"
    editor.session.setMode(context.mode);
    container[inputId] = {
        mode: "ace/mode/text", 
        value: "", 
        name: "untitled"
    }
    updateTotalSize()
    sidebarItem.click()
    langMode.innerHTML = context.mode.split("/")[2].toUpperCase()
})

// file drop callback
function dropHandler(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.items) {
        [...ev.dataTransfer.items].forEach((item, _) => {
            let inputId = generateRandomId()
            if (item.kind === 'file') {
                const file = item.getAsFile();
                var mode = modelist.getModeForPath(file.name).mode;
                editor.session.setMode(mode);
                let resolvedLang = modeToLabel(mode)
                langMode.innerHTML = resolvedLang.toUpperCase()
                var reader = new FileReader();
                reader.onload = function(e) {
                    let sidebarItem = generateSidebarItem(inputId, resolvedLang, file.name)
                    sidebarItemArray.push(sidebarItem)
                    document.getElementsByClassName("sidebar")[0].appendChild(sidebarItem)
                    container[inputId] = {mode: mode, value: e.target.result, name: file.name}
                    updateTotalSize()
                    sidebarItem.click()
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

// bottom bar link callback
let linkToFile = document.getElementById("link-to-file")
linkToFile.addEventListener("click", function() {
    saveButton.click()
    navigator.clipboard.writeText(linkToFile.innerHTML)
    let fileLinkElement = document.getElementById("link-to-file")
    fileLinkElement.style.color = "#00b0ff"
    let popup = document.getElementById("popup")
    popup.style.display = "flex"
    setTimeout(function() {
        fileLinkElement.style.color = "white"
        popup.style.display = "none"
    }, 900)
})

// listen for edit events
let autosaveTimer = null;
let editorTextInput = document.getElementsByClassName("ace_text-input")[0]
editorTextInput.addEventListener("keydown", function(e) {
    syncModeElement.style.display = "none"
    if (autosaveTimer) {
        clearTimeout(autosaveTimer);
    }
    autosaveTimer = setTimeout(function() {
        container[context.id] = {
            mode: context.mode, 
            value: editor.getValue(), 
            name: document.getElementById(context.id).value
        }
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
    if (context.id != "default") {
        let sidebarItem = document.getElementById(`${context.id}-item`)
        if (sidebarItem) {
            let index = sidebarItemArray.indexOf(sidebarItem)
            sidebarItemArray.splice(index, 1)
            sidebarItem.remove()
            delete container[context.id]
            saveButton.click()
            if (index == sidebarItemArray.length) {
                index--
            }
            sidebarItemArray[index].click()
        }
    } else {
        let h3 = document.getElementById("popup-text")
        h3.innerHTML = "Can't delete default file"
        let popup = document.getElementById("popup")
        popup.style.display = "flex"
        setTimeout(function() {popup.style.display = "none"} , 900)
    }
})

//handle upload button
let uploadButton = document.getElementById("upload")
uploadButton.addEventListener("click", function() {
    fileInput.click()
})

// handle file upload
let fileInput = document.getElementById("files")
fileInput.addEventListener("change", function() {
    let file = fileInput.files[0]
    let mode = modelist.getModeForPath(file.name).mode;
    editor.session.setMode(mode);
    let resolvedLang = modeToLabel(mode)
    langMode.innerHTML = resolvedLang.toUpperCase()
    var reader = new FileReader();
    reader.onload = function(e) {
        let inputId = generateRandomId()
        let sidebarItem = generateSidebarItem(inputId, resolvedLang, file.name)
        sidebarItemArray.push(sidebarItem)
        document.getElementsByClassName("sidebar")[0].appendChild(sidebarItem)
        container[inputId] = {mode: mode, value: e.target.result, name: file.name}
        sidebarItem.click()
        saveButton.click()
    }
    reader.readAsText(file);
})

// listen right click event
document.addEventListener("contextmenu", function(e) {
    e.preventDefault()
    console.log(e.target)
})