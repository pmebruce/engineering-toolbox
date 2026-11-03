# 流體物性查詢 / Fluid Properties

獨立、零相依的單頁前端工具。直接開啟 index.html 即可運作，也可將此目錄單獨部署到 Cloudflare Pages（不需要建置）。工具箱入口已整合搜尋及釘選。

## 模型

- Air：CoolProp INCOMP Air，固定 101325 Pa 的乾空氣擬合。App 限 −50～200°C。
- Water：MEG 0 wt% 的純水端點，限 0～95°C；不是 IAPWS 高精度水 EOS。
- MEG / MPG：Melinder 2010，0～60 wt%，質量濃度；不可當作體積濃度。本版溫度限 max(−50°C, model freezing point)～95°C；低於冰點拒絕輸出。
- 液體忽略壓力效應；使用者需確認單相。品牌含添加劑冷卻液以供應商資料為準。
- 模型係數與 MIT 授權完整嵌入 HTML，離線下載後不需任何 CDN。網站本身不保證離線快取。

## 來源快照

擷取日期 2026-11-03，CoolProp/CoolProp：

| 來源 | Git blob SHA |
| --- | --- |
| dev/incompressible_liquids/json/Air.json | b50a33503309c25e4178941f7ad20a97aba959cc |
| dev/incompressible_liquids/json/MEG.json | 03b6abe6dfa692c6ebd9e2ae7af6031651811523 |
| dev/incompressible_liquids/json/MPG.json | 062d2df4954e7767be7760368f63e9707726c6a7 |

多項式矩陣以列為溫度次方、欄為濃度次方；T-Tbase，x-xbase。exppolynomial 取 exp；Air exponential 以絕對 K 輸入 exp(c0/(T+c1)-c2)。未使用新增加的 Chebyshev 欄位，保留舊有 polynomial 模型。Water 佔位項僅作選單檢查，物性實際使用 MEG 的 x=0；純水冰點強制為 0°C。

ν=μ/ρ，Pr=μcp/k，α=k/(ρcp)，體積熱容=ρcp。

## 驗證

299 組有效條件的正值、範圍與衍生式檢查；冰點下方、溫度／濃度越界、步長為0與表格過多筆數拒絕；表格結束端點及單一點檢查；水與 EG 0% 一致性；空氣升溫黏度上升、液體升溫黏度下降。

瀏覽器已檢查 EG50 在 40°C 的更新、低於冰點時隱藏結果、PG25 單點報告複製、物性圖表切換。桌面互動已檢查；手機實機未測。

## 功能

ρ、cp、k、μ、ν、Pr、熱擴散率、體積熱容；濃度與單點溫度；溫度表、SVG 趨勢圖、CSV（含來源和 SI 單位）、單點複製、列印；localStorage 記住條件。CSV 保留無效列與原因，不作範圍外插。
