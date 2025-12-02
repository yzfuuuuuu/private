// 获取开关元素
const toggleSwitch = document.getElementById('toggleSwitch');
const statusText = document.getElementById('statusText');

// 从存储中读取开关状态
chrome.storage.sync.get(['translationEnabled'], (result) => {
  const enabled = result.translationEnabled !== false; // 默认为 true
  toggleSwitch.checked = enabled;
  updateStatusText(enabled);
});

// 监听开关变化
toggleSwitch.addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ translationEnabled: enabled }, () => {
    updateStatusText(enabled);
    
    // 通知当前标签页更新
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggleTranslation', 
          enabled: enabled 
        });
      }
    });
  });
});

// 更新状态文本
function updateStatusText(enabled) {
  if (enabled) {
    statusText.textContent = '已开启';
    statusText.className = 'switch-label enabled';
  } else {
    statusText.textContent = '已关闭';
    statusText.className = 'switch-label disabled';
  }
}

// ========== 搜索功能 ==========
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const noResults = document.getElementById('noResults');

// 搜索翻译（支持三语搜索：简体中文、繁体中文、英语）
function searchTranslations(query) {
  if (!query || query.trim() === '') {
    resultsList.innerHTML = '';
    noResults.style.display = 'none';
    return;
  }

  const searchTerm = query.trim().toLowerCase();
  const matches = [];

  // 遍历翻译数组，查找包含搜索词的三语翻译
  // 使用 translations.js 中定义的 translations 数组
  for (const item of translations) {
    const matchSimplified = item.simplified.toLowerCase().includes(searchTerm);
    const matchTraditional = item.traditional.toLowerCase().includes(searchTerm);
    const matchEnglish = item.english.toLowerCase().includes(searchTerm);
    
    if (matchSimplified || matchTraditional || matchEnglish) {
      matches.push(item);
    }
  }

  // 显示结果
  if (matches.length === 0) {
    resultsList.innerHTML = '';
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
    displayResults(matches);
  }
}

// 显示搜索结果（显示双语：简体中文和繁体中文）
function displayResults(matches) {
  resultsList.innerHTML = '';
  
  matches.forEach((item) => {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    // 创建内容容器
    const resultContent = document.createElement('div');
    resultContent.className = 'result-content';
    
    // 简体中文
    const simplifiedText = document.createElement('div');
    simplifiedText.className = 'result-simplified';
    simplifiedText.textContent = item.simplified;
    
    // 繁体中文
    const traditionalText = document.createElement('div');
    traditionalText.className = 'result-traditional';
    traditionalText.textContent = item.traditional;
    
    // 英语
    const englishText = document.createElement('div');
    englishText.className = 'result-english';
    englishText.textContent = item.english;
    
    resultContent.appendChild(simplifiedText);
    resultContent.appendChild(traditionalText);
    resultContent.appendChild(englishText);
    
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    
    // 复制简体中文按钮
    const copySimplifiedButton = createCopyButton('简', () => {
      copyToClipboard(item.simplified, 'simplified');
    });
    
    // 复制繁体中文按钮
    const copyTraditionalButton = createCopyButton('繁', () => {
      copyToClipboard(item.traditional, 'traditional');
    });
    
    // 复制英语按钮
    const copyEnglishButton = createCopyButton('EN', () => {
      copyToClipboard(item.english, 'english');
    });
    
    buttonContainer.appendChild(copySimplifiedButton);
    buttonContainer.appendChild(copyTraditionalButton);
    buttonContainer.appendChild(copyEnglishButton);
    
    resultItem.appendChild(resultContent);
    resultItem.appendChild(buttonContainer);
    
    resultsList.appendChild(resultItem);
  });
}

// 创建复制按钮
function createCopyButton(text, onClick) {
  const button = document.createElement('button');
  button.className = 'copy-button';
  button.textContent = text;
  button.title = `复制${text}`;
  button.addEventListener('click', () => {
    onClick();
    // 临时改变按钮文本提示已复制
    const originalText = button.textContent;
    button.textContent = '✓';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 1000);
  });
  return button;
}

// 复制到剪贴板
function copyToClipboard(text, type) {
  // 使用现代 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('已复制到剪贴板');
    }).catch(err => {
      console.error('复制失败:', err);
      fallbackCopy(text);
    });
  } else {
    // 降级方案
    fallbackCopy(text);
  }
}

// 降级复制方案
function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('复制失败:', err);
  }
  document.body.removeChild(textArea);
}

// 监听搜索输入
searchInput.addEventListener('input', (e) => {
  searchTranslations(e.target.value);
});

// 监听回车键，防止表单提交
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
  }
});

