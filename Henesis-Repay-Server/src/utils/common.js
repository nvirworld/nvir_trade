exports.timestamp_to_date = function (datetime) {
  const date = new Date(datetime);
  const y = date.getFullYear(),
    m = (date.getMonth() + 1).toString().padStart(2, '0'),
    d = date.getDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
};
