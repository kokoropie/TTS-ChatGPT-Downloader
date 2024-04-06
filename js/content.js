if (!localStorage.getItem("token")) {
    fetch("https://chat.openai.com/api/auth/session", {
        "method": "GET",
        "credentials": "include"
    }).then(res => res.json()).then(data => {
        localStorage.setItem("token", data.accessToken);
        let url = "https://chat.openai.com/backend-api/settings/user"
        fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${data.accessToken}`
            }
        }).then( res => res.json() )
        .then(json => {
            localStorage.setItem("voice", json.settings.voice_name ?? "cove");
        }).catch(err => console.error(err))
    }).catch(err => console.error(err))
}

function getFormat() {
    if ("MediaSource" in window) {
        let e = e => MediaSource.isTypeSupported(e);
        if (e("audio/aac"))
            return "aac";
        if (e("audio/mpeg"))
            return "mp3";
        if (e("audio/ogg"))
            return "ogg"
    }
    return void 0
}

if (localStorage.getItem("token")) {
    const observer = new MutationObserver((mutations, observer) => {
        jQuery("[data-testid]").each((i, parent) => {
            jQuery(parent).find("[data-message-author-role=assistant]").last().each((i, el) => {
                if (el.childNodes[0] && !el.childNodes[0].classList.contains("result-streaming")) {
                    let tmp = el.parentElement.nextElementSibling
                    let messageId = el.dataset.messageId;
                    let conversationId = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
                    if (!parent.dataset.addedButton) {
                        let el2 = jQuery(tmp).find("[data-state]")[0].parentElement;
                        jQuery(el2).find(".custom-button").remove();
                        parent.dataset.addedButton = true;
                        let span = document.createElement("span");
                        span.setAttribute("class", "custom-button");
                        span.dataset.messageId = messageId;
                        span.dataset.conversationId = conversationId;
                        span.addEventListener("click", async (event) => {
                            let target = event.target
                            while (target.tagName.toUpperCase() !== "SPAN") {
                                target = target.parentElement;
                            }
                            let messageId = target.dataset.messageId;
                            let conversationId = target.dataset.conversationId;
                            let format = getFormat();
                            let voice = localStorage.getItem("voice") ?? "cove";
                            if (format) {
                                fetch(`https://chat.openai.com/backend-api/synthesize?message_id=${messageId}&conversation_id=${conversationId}&voice=${voice}&format=${format}`, {
                                    method: "GET",
                                    headers: {
                                        "Authorization": `Bearer ${localStorage.getItem("token")}`,
                                        "oai-device-id": localStorage.getItem("oai-did"),
                                        "oai-language": "en-US",
                                    }
                                }).then( res => res.blob() )
                                .then( blob => {
                                    const downloadUrl = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = downloadUrl;
                                    let time = new Date().getTime();
                                    a.download = `${time}.${format}`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(downloadUrl);
                                    document.body.removeChild(a);
                                }).catch(err => console.error(err))
                            }
                        })
                        span.innerHTML = `<button class="flex items-center gap-1.5 rounded-md p-1 text-xs text-token-text-tertiary hover:text-token-text-primary md:invisible md:group-hover:visible md:group-[.final-completion]:visible">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon-md"><path fill="currentColor" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/></svg>
                        </button>`;
                        let interval = setInterval(() => {
                            let el2 = jQuery(tmp).find("[data-state]")[0].parentElement;
                            if (jQuery(el2).children(".flex").length) {
                                clearInterval(interval);
                                el2.appendChild(span);
                            }
                        }, 0)
                    }
                }
            })
        })
    });
    observer.observe(document, {
        subtree: true,
        attributes: true,
    });
}