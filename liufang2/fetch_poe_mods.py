#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
流放之路编年史词条抓取脚本
从 poedb.tw 抓取所有词条数据并转换为三语格式
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time

def fetch_mods_from_poedb():
    """从流放之路编年史抓取词条数据"""
    
    # 流放之路2词缀页面URL
    base_urls = [
        'https://poedb.tw/cn/POE2/Mods',
        'https://poedb.tw/cn/POE2/Mods?type=prefix',
        'https://poedb.tw/cn/POE2/Mods?type=suffix',
    ]
    
    all_mods = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    print("开始抓取流放之路2词条数据...")
    
    for url in base_urls:
        try:
            print(f"正在访问: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            response.encoding = 'utf-8'
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 查找词条表格
                tables = soup.find_all('table')
                for table in tables:
                    rows = table.find_all('tr')
                    for row in rows[1:]:  # 跳过表头
                        cells = row.find_all('td')
                        if len(cells) >= 3:
                            # 提取简繁英三语
                            simplified = cells[0].get_text(strip=True) if len(cells) > 0 else ''
                            traditional = cells[1].get_text(strip=True) if len(cells) > 1 else ''
                            english = cells[2].get_text(strip=True) if len(cells) > 2 else ''
                            
                            if simplified and english:
                                all_mods.append({
                                    'simplified': simplified,
                                    'traditional': traditional or simplified,  # 如果没有繁体，使用简体
                                    'english': english
                                })
                
                time.sleep(1)  # 避免请求过快
                
        except Exception as e:
            print(f"访问 {url} 时出错: {e}")
            continue
    
    return all_mods

def generate_js_file(mods):
    """生成JavaScript格式的词条文件"""
    
    js_content = "// 三语翻译映射表（简体中文、繁体中文、英语）\n"
    js_content += "// 数据结构：{ simplified: '简体中文', traditional: '繁體中文', english: 'English' }\n"
    js_content += "const translations = [\n"
    
    # 添加现有词条（保留之前的分类）
    js_content += "  // ========== 流放之路2 (Path of Exile 2) 装备词条 ==========\n"
    
    for mod in mods:
        simplified = mod['simplified'].replace("'", "\\'")
        traditional = mod['traditional'].replace("'", "\\'")
        english = mod['english'].replace("'", "\\'")
        
        js_content += f"  {{ simplified: '{simplified}', traditional: '{traditional}', english: '{english}' }},\n"
    
    js_content += "];\n\n"
    js_content += "// 为了兼容 content.js，创建一个从英语到简体中文的映射对象\n"
    js_content += "const translationsMap = {};\n"
    js_content += "translations.forEach(item => {\n"
    js_content += "  translationsMap[item.english] = item.simplified;\n"
    js_content += "});\n\n"
    js_content += "// 导出\n"
    js_content += "if (typeof module !== 'undefined' && module.exports) {\n"
    js_content += "  module.exports = { translations, translationsMap };\n"
    js_content += "}\n"
    
    return js_content

def main():
    """主函数"""
    print("=" * 50)
    print("流放之路2词条抓取工具")
    print("=" * 50)
    
    # 抓取数据
    mods = fetch_mods_from_poedb()
    
    if not mods:
        print("\n警告: 未能从网站抓取到数据，将使用备用方案...")
        print("建议: 请手动访问 https://poedb.tw/cn/POE2/Mods 获取数据")
        return
    
    print(f"\n成功抓取 {len(mods)} 个词条")
    
    # 生成JS文件
    js_content = generate_js_file(mods)
    
    # 保存到文件
    output_file = 'translations_poe2.js'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"\n词条数据已保存到: {output_file}")
    print(f"共 {len(mods)} 个词条")
    
    # 也保存JSON格式供参考
    json_file = 'poe2_mods.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(mods, f, ensure_ascii=False, indent=2)
    
    print(f"JSON格式数据已保存到: {json_file}")

if __name__ == '__main__':
    main()

