// 翻译映射从 translations.js 加载（在 manifest.json 中已配置）
// translationsMap 对象在 translations.js 中定义（从英语到简体中文的映射）

// 翻译函数（将英文翻译成简体中文）
function translateText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // 去除首尾空格
  const trimmedText = text.trim();
  
  // 精确匹配
  if (translationsMap[trimmedText]) {
    return translationsMap[trimmedText];
  }
  
  // 尝试匹配大小写不敏感的版本
  const lowerText = trimmedText.toLowerCase();
  for (const [key, value] of Object.entries(translationsMap)) {
    if (key.toLowerCase() === lowerText) {
      return value;
    }
  }
  
  // 如果找不到匹配，返回原文
  return text;
}

// 翻译元素内的文本节点
function translateNode(node) {
  if (!isTranslationEnabled) {
    return;
  }
  
  // 跳过 script 和 style 标签
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName?.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
      return;
    }
  }
  
  // 如果是文本节点
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (text && text.trim()) {
      const translated = translateText(text);
      if (translated !== text) {
        saveOriginalText(node, text, 'text');
        node.textContent = translated;
      }
    }
    return;
  }
  
  // 如果是元素节点，检查属性
  if (node.nodeType === Node.ELEMENT_NODE) {
    // 翻译 title 属性
    if (node.title) {
      const translated = translateText(node.title);
      if (translated !== node.title) {
        saveOriginalText(node, node.title, 'title');
        node.title = translated;
      }
    }
    
    // 翻译 placeholder 属性
    if (node.placeholder) {
      const translated = translateText(node.placeholder);
      if (translated !== node.placeholder) {
        saveOriginalText(node, node.placeholder, 'placeholder');
        node.placeholder = translated;
      }
    }
    
    // 翻译 alt 属性
    if (node.alt) {
      const translated = translateText(node.alt);
      if (translated !== node.alt) {
        saveOriginalText(node, node.alt, 'alt');
        node.alt = translated;
      }
    }
    
    // 翻译 value 属性（对于按钮等）
    if (node.value && node.tagName === 'INPUT' && (node.type === 'button' || node.type === 'submit' || node.type === 'reset')) {
      const translated = translateText(node.value);
      if (translated !== node.value) {
        saveOriginalText(node, node.value, 'value');
        node.value = translated;
      }
    }
  }
  
  // 递归处理子节点
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    translateNode(children[i]);
  }
}

// 翻译状态
let isTranslationEnabled = true;
let observer = null;

// 存储原始文本的映射（用于恢复）
// 使用 Map 存储，key 为节点，value 为对象，包含不同类型的原始值
const originalTexts = new Map();

// 保存原始文本
function saveOriginalText(node, originalText, type = 'text') {
  if (!originalTexts.has(node)) {
    originalTexts.set(node, {});
  }
  const nodeData = originalTexts.get(node);
  nodeData[type] = originalText;
}

// 恢复原始文本
function restoreOriginalText(node) {
  if (!originalTexts.has(node)) {
    return;
  }
  
  const nodeData = originalTexts.get(node);
  
  if (node.nodeType === Node.TEXT_NODE && nodeData.text) {
    node.textContent = nodeData.text;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if (nodeData.title !== undefined) {
      node.title = nodeData.title;
    }
    if (nodeData.placeholder !== undefined) {
      node.placeholder = nodeData.placeholder;
    }
    if (nodeData.alt !== undefined) {
      node.alt = nodeData.alt;
    }
    if (nodeData.value !== undefined) {
      node.value = nodeData.value;
    }
  }
}

// 使用 MutationObserver 监听 DOM 变化
function observeChanges() {
  if (observer) {
    observer.disconnect();
  }
  
  if (!isTranslationEnabled) {
    return;
  }
  
  observer = new MutationObserver((mutations) => {
    if (!isTranslationEnabled) return;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          translateNode(node);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 恢复整个页面的原始文本
function restorePage() {
  if (!document.body) {
    return;
  }
  
  // 遍历所有保存的节点并恢复
  const nodesToRestore = Array.from(originalTexts.keys());
  nodesToRestore.forEach(node => {
    // 检查节点是否还在 DOM 中
    if (document.body.contains(node) || node === document.body || document.body.contains(node.parentNode)) {
      restoreOriginalText(node);
    }
  });
  
  // 同时递归遍历整个 DOM 树，确保所有节点都被处理
  function restoreNode(node) {
    restoreOriginalText(node);
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      restoreNode(children[i]);
    }
  }
  
  restoreNode(document.body);
}

// 初始化翻译
function initTranslation() {
  if (!isTranslationEnabled) {
    return;
  }
  
  if (document.body) {
    translateNode(document.body);
    observeChanges();
  } else {
    // 如果 body 还没加载，等待 DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      if (isTranslationEnabled && document.body) {
        translateNode(document.body);
        observeChanges();
      }
    });
  }
}

// 切换翻译状态
function toggleTranslation(enabled) {
  isTranslationEnabled = enabled;
  
  if (enabled) {
    // 开启翻译
    if (document.body) {
      translateNode(document.body);
      observeChanges();
    }
  } else {
    // 关闭翻译，恢复原文
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // 恢复整个页面的原始文本
    restorePage();
  }
}

// 从存储中读取开关状态
chrome.storage.sync.get(['translationEnabled'], (result) => {
  const enabled = result.translationEnabled !== false; // 默认为 true
  isTranslationEnabled = enabled;
  
  if (enabled) {
    // 页面加载完成后开始翻译
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTranslation);
    } else {
      initTranslation();
    }
  }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleTranslation') {
    toggleTranslation(request.enabled);
    sendResponse({ success: true });
  }
  return true;
});

