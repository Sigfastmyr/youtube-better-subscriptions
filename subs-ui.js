const HIDE_WATCHED_TOGGLE = PREFIX + "hide-watched-toggle";
const HIDE_WATCHED_LABEL = PREFIX + "hide-watched-toggle-label";
const MARK_ALL_WATCHED_BTN = PREFIX + "subs-grid-menu-mark-all";
const SETTINGS_BTN = PREFIX + "subs-grid-menu-settings";
const MARK_WATCHED_BTN = PREFIX + "mark-watched";
const MARK_UNWATCHED_BTN = PREFIX + "mark-unwatched";
const METADATA_LINE = PREFIX + "metadata-line";
const COLLAPSE_SECTION_CHECKBOX = PREFIX + "collapse-section";

const HIDDEN_CLASS = PREFIX + "hidden";
const COLLAPSE_CLASS = PREFIX + "collapse-section";

let addedElems = [];

function showWatched() {
    log("Showing watched videos");

    for (let item of hidden) {
        item.style.display = '';
        item.classList.remove(HIDDEN_CLASS);
    }
    hidden = [];

    processSections();
}

function buildUI() {
    log("Building subs UI");

    addHideWatchedCheckbox();
    addHideAllMenuButton();
    addSettingsButton();

    if (settings["settings.hide.watched.ui.stick.right"])
        addedElems[0].after(...addedElems)
}

function buildMenuButtonContainer() {
    let menuButtonContainer;
    menuButtonContainer = document.createElement("h2");
    menuButtonContainer.classList.add("yt-simple-endpoint");
    menuButtonContainer.classList.add("style-scope");
    menuButtonContainer.classList.add("ytd-compact-link-renderer");

    menuButtonContainer.classList.add("subs-grid-menu-item");

    return menuButtonContainer;
}

function deleteOldButton(ID) {
    const oldButton = document.querySelector(`#${ID}`);
    if (oldButton) {
        oldButton.remove();
    }
}

function addSettingsButton() {
    deleteOldButton(SETTINGS_BTN);

    let settingsButton = buildMenuButtonContainer();
    settingsButton.classList.add("subs-btn-settings");
    settingsButton.setAttribute("id", SETTINGS_BTN);

    addElementToMenuUI(settingsButton);

    let messenger = document.getElementById(SETTINGS_BTN);
    messenger.addEventListener("click", () => brwsr.runtime.sendMessage({ "action": "openOptionsPage" }));
}

function addHideAllMenuButton() {
    if (settings["settings.hide.watched.all.label"]) {
        deleteOldButton(MARK_ALL_WATCHED_BTN);

        let hideAllButtonContainer = buildMenuButtonContainer();
        hideAllButtonContainer.classList.add("subs-grid-menu-mark-all");
        hideAllButtonContainer.setAttribute("id", MARK_ALL_WATCHED_BTN);

        hideAllButtonContainer.appendChild(document.createTextNode("Mark all as watched"));

        addElementToMenuUI(hideAllButtonContainer);

        let messenger = document.getElementById(MARK_ALL_WATCHED_BTN);
        messenger.addEventListener("click", markAllAsWatched);
    }
}

function addHideWatchedCheckbox() {
    if (settings["settings.hide.watched.label"]) {
        deleteOldButton(HIDE_WATCHED_LABEL);

        let hideWatchedLabel = buildMenuButtonContainer();
        hideWatchedLabel.setAttribute("id", HIDE_WATCHED_LABEL);
        hideWatchedLabel.appendChild(document.createTextNode("Hide watched")); //TODO: translations
        addElementToMenuUI(hideWatchedLabel);

        let messenger = document.getElementById(HIDE_WATCHED_LABEL);
        messenger.addEventListener("click", hideWatchedChanged);
    }

    deleteOldButton(HIDE_WATCHED_TOGGLE);

    let toggleContainer = document.createElement("div");
    toggleContainer.setAttribute("id", HIDE_WATCHED_TOGGLE);
    toggleContainer.classList.add("toggle-container", "style-scope", "tp-yt-paper-toggle-button");
    if (hideWatched) {
        toggleContainer.classList.add("subs-btn-hide-watched-checked");
    } else {
        toggleContainer.classList.add("subs-btn-hide-watched-unchecked");
    }

    let toggleBar = document.createElement("div");
    toggleBar.classList.add("toggle-bar", "style-scope", "tp-yt-paper-toggle-button");
    let toggleButton = document.createElement("div");
    toggleButton.classList.add("toggle-button", "style-scope", "tp-yt-paper-toggle-button");

    toggleContainer.appendChild(toggleBar);
    toggleContainer.appendChild(toggleButton);

    addElementToMenuUI(toggleContainer);

    let messenger = document.getElementById(HIDE_WATCHED_TOGGLE);
    messenger.addEventListener("click", hideWatchedChanged);
}

function addElementToMenuUI(element) {
    log("Adding element to menu UI");

    let topMenuEnd = document.getElementById("end");
    if (topMenuEnd != null) { //just in case...
        if (settings["settings.hide.watched.ui.stick.right"])
            topMenuEnd.prepend(element);
        else
            topMenuEnd.parentNode.insertBefore(element, topMenuEnd);
    }

    addedElems.push(element);
}

function buildMarkWatchedButton(dismissibleDiv, item, videoId, isMarkWatchedBtn = true) {
    let enclosingDiv = document.createElement("div");
    enclosingDiv.setAttribute("id", METADATA_LINE);
    enclosingDiv.classList.add("style-scope", "ytd-thumbnail-overlay-toggle-button-renderer");

    let button = document.createElement("button");
    button.setAttribute("id", isMarkWatchedBtn ? MARK_WATCHED_BTN : MARK_UNWATCHED_BTN);
    button.classList.add(isMarkWatchedBtn ? "subs-btn-mark-watched" : "subs-btn-mark-unwatched");
    button.setAttribute("role", "button");

    let vid = new SubscriptionVideo(item);
    if (isMarkWatchedBtn) {
        button.onclick = () => {
            vid.markWatched();
        };
    } else {
        button.onclick = () => {
            vid.markUnwatched();
            let metaDataElem = item.querySelector("#" + METADATA_LINE);
            let container = metaDataElem.parentNode;
            container.removeChild(metaDataElem);
            container.appendChild(buildMarkWatchedButton(dismissibleDiv, item, videoId));
        }
    }

    enclosingDiv.appendChild(button);

    if (isMarkWatchedBtn)
        dismissibleDiv.classList.remove("semitransparent");
    else
        dismissibleDiv.classList.add("semitransparent");

    return enclosingDiv;
}

let collapsibleIdNum = 0;

function addCollapsibleBtnToSection(sectionHeader) {
    try {
        // only add if doesnt have it already
        if (sectionHeader.parentNode.querySelector("." + COLLAPSE_CLASS) == null) {

            let collapsibleId = COLLAPSE_SECTION_CHECKBOX + collapsibleIdNum++;

            let collapseCheckbox = document.createElement("input");
            collapseCheckbox.setAttribute("id", collapsibleId);
            collapseCheckbox.setAttribute("type", "checkbox");
            collapseCheckbox.checked = true;
            collapseCheckbox.classList.add(COLLAPSE_CLASS);

            sectionHeader.parentNode.appendChild(collapseCheckbox);

            let messenger = document.getElementById(collapsibleId);
            messenger.addEventListener("change", collapseSectionChanged);
        }
    } catch (e) {
        logError(e);
    }
}

function processSections() {
    log("Processing sections");

    let sections = document.querySelectorAll(sectionsQuery());
    log("Found " + sections.length + " sections.");

    for (let section of sections) {
        let sectionHeader = section.querySelector(sectionTitleQuery());
        // Temporary fix for PAGES.channel TODO: refactor this (when more pages added)
        if (!sectionHeader) break;
        // Ignore for list view
        if (section.classList.contains("ytd-section-list-renderer")) break;

        let sectionTitle = sectionHeader.textContent;

        // add collapse button to sections
        addCollapsibleBtnToSection(sectionHeader);

        // hide or show sections
        if (section.querySelector(vidQuery()) == null) {
            // section has no videos that arent hidden, so hide it
            if (!section.classList.contains(HIDDEN_CLASS)) {
                log("Hiding section '" + sectionTitle + "'");
                section.style.display = 'none';
                section.classList.add(HIDDEN_CLASS);
            }
        } else {
            // section has some videos that arent hidden, in case we hid it before, show it now
            if (section.classList.contains(HIDDEN_CLASS)) {
                log("Showing section '" + sectionTitle + "'");
                section.style.display = '';
                section.classList.remove(HIDDEN_CLASS);
            }
        }
    }
    log("Processing sections... Done");
}

function removeWatchedAndAddButton() {
    log("Removing watched from feed and adding overlay");

    let els = document.querySelectorAll(vidQuery());

    let hiddenCount = 0;

    // Get max age from settings (default 7 if not set, 0 disables limit)
    let MAX_DAYS_OLD = 25;
    if (settings && settings["settings.max.video.age.days"] !== undefined) {
        let val = parseInt(settings["settings.max.video.age.days"], 10);
        if (!isNaN(val)) MAX_DAYS_OLD = val;
    }
    for (let item of els) {
        let vid = new SubscriptionVideo(item);

        // --- Hide if video is older than MAX_DAYS_OLD ---
        let publishedText = null;
        // Try to find the published time text in common YouTube metadata locations
        let metaElem = item.querySelector("#metadata-line span");
        if (metaElem) {
            publishedText = metaElem.textContent.trim();
        }
        // Fallback: try to find any span with 'ago' in text
        if (!publishedText) {
            let spans = item.querySelectorAll("span");
            for (let s of spans) {
                if (s.textContent && s.textContent.match(/\bago\b/)) {
                    publishedText = s.textContent.trim();
                    break;
                }
            }
        }

        let isTooOld = false;
        if (publishedText) {
            // Parse the publishedText (e.g., "3 days ago", "1 week ago")
            let match = publishedText.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s+ago/i);
            if (match) {
                let num = parseInt(match[1], 10);
                let unit = match[2];
                let days = 0;
                switch (unit) {
                    case "minute":
                    case "hour":
                        days = 0; break;
                    case "day":
                        days = num; break;
                    case "week":
                        days = num * 7; break;
                    case "month":
                        days = num * 30; break;
                    case "year":
                        days = num * 365; break;
                }
                if (days > MAX_DAYS_OLD) {
                    isTooOld = true;
                    oldVideosFiltered = true;
                }
            }
        }

        if (isTooOld) {
            vid.hide();
            hiddenCount++;
            continue;
        }

        if (!vid.isStored && isYouTubeWatched(item)) {
            vid.markWatched();
        } else if (
            (hideWatched && vid.isStored) ||
            (hidePremieres && vid.isPremiere) ||
            (hideShorts && vid.isShort)
        ) {
            vid.hide();
            hiddenCount++;
        }

        // does it already have any button?
        if (!vid.hasButton()) {
            vid.addButton();
        }
    }


    // if shorts shelf is empty, hide it
    const gridElement = document.querySelector('ytd-two-column-browse-results-renderer ytd-rich-grid-renderer #contents');
    if (gridElement && isRendered(gridElement)) {
        [...gridElement.querySelectorAll(':scope > ytd-rich-section-renderer')].forEach(richSectionElement => {
            const contents = richSectionElement.querySelector(':scope > #content > ytd-rich-shelf-renderer > #dismissible > #contents');

            if (!contents) {
                return;
            }
            if (![...contents.childNodes].some(child => isRendered(child))) {
                richSectionElement.style.display = 'none';
            }
        });
    }
    log("Removing watched from feed and adding overlay... Done");

    // if we hid any videos, see if sections need changing, or videos loading
    if (hiddenCount > 0) {
        processSections();
        loadMoreVideos();
    }

    // Only block YouTube autoload if old videos were filtered
    if (oldVideosFiltered) {
        blockYouTubeAutoload();
    }
}

function removeUI() {
    addedElems.forEach((elem) => {
        elem.parentNode.removeChild(elem);
    });

    addedElems = [];

    // delete built buttons
    document.querySelectorAll("#" + METADATA_LINE).forEach(e => e.remove());

    // make hidden videos visible
    for (let item of hidden) {
        item.style.display = '';
        item.classList.remove(HIDDEN_CLASS);
    }
    hidden = [];
}

// Register the callback to run after settings are loaded
if (typeof settingsLoadedCallbacks !== "undefined") {
    settingsLoadedCallbacks.push(onSettingsLoaded);
} else if (typeof settings !== "undefined" && settingsLoaded) {
    // fallback: if settings are already loaded, run immediately
    onSettingsLoaded();
} else {
    // fallback: run after DOMContentLoaded if settingsLoadedCallbacks is missing
    document.addEventListener("DOMContentLoaded", onSettingsLoaded);
}