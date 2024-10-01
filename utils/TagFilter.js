const useFilterTags = (tags, delim) => {
  const filterdTag = tags?.split(delim || "#").map((data) => {
    return data.trim();
  });
  const filtered = filterdTag?.filter((item) => item !== "");
  const filteredSet = [...new Set(filtered)];

  return filteredSet;
};

module.exports = { useFilterTags };
