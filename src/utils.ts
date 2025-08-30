/**
 * 格式化数字，避免科学计数法
 * @param value 数字
 * @param decimals 保留小数位
 */
export function formatNumber(num: number, decimals = 9) {
  if (!num) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    useGrouping: false,
  });
}