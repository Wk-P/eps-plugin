(() => {
    const css = `
en-word {
    position: relative;
    color: #007bff;
    border-bottom: 1px dashed #007bff;
    cursor: help;
    display: inline-block;
}
en-word::after {
    content: attr(data-ipa);
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background-color: #333;
    color: #fff;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 0.85em;
    font-family: "Segoe UI", sans-serif;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, transform 0.2s;
    z-index: 10;
}
en-word:hover::after {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}`;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const cache = {};

    async function annotate(el) {
        const word = el.textContent.trim().toLowerCase();
        if (!word) return;

        if (cache[word]) {
            el.setAttribute("data-ipa", cache[word]);
            return;
        }

        el.setAttribute("data-ipa", "[加载中...]");

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!res.ok) throw new Error();
            const data = await res.json();

            const phonetics = data[0].phonetics;
            const us = phonetics.find(p => p.audio && p.audio.includes('-us'));
            const uk = phonetics.find(p => p.audio && p.audio.includes('-uk'));

            let ipa = "";
            if (us?.text && uk?.text) {
                ipa = `美 ${us.text} | 英 ${uk.text}`;
            } else if (us?.text) {
                ipa = `美 ${us.text}`;
            } else if (uk?.text) {
                ipa = `英 ${uk.text}`;
            } else {
                ipa = data[0].phonetic || (phonetics.find(p => p.text) || {}).text || "";
            }

            cache[word] = ipa || "[未找到音标]";
            el.setAttribute("data-ipa", cache[word]);
        } catch {
            el.setAttribute("data-ipa", "[查无此词]");
        }
    }

    function scan(root = document) {
        root.querySelectorAll("en-word:not([data-ipa])").forEach(annotate);
    }

    // 页面加载后处理已有的 <en-word>
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => scan());
    } else {
        scan();
    }

    // 监听动态插入的 <en-word>（适用于 SPA 或动态内容）
    new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.matches?.("en-word")) annotate(node);
                else node.querySelectorAll?.("en-word:not([data-ipa])").forEach(annotate);
            }
        }
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
