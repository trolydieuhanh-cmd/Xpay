#include "xpaychat_core.h"

#include <algorithm>
#include <cctype>

namespace xpaychat {

const char* coreVersion() {
  return "nexacore-0.1.0-native-seed";
}

std::string normalizePhoneDigits(const std::string& input) {
  std::string digits;
  digits.reserve(input.size());
  for (unsigned char character : input) {
    if (std::isdigit(character)) digits.push_back(static_cast<char>(character));
  }
  return digits;
}

bool isLikelyPhone(const std::string& input) {
  const std::string digits = normalizePhoneDigits(input);
  return digits.size() >= 8 && digits.size() <= 15;
}

std::string redactPhone(const std::string& input) {
  const std::string digits = normalizePhoneDigits(input);
  if (digits.size() <= 4) return "****";
  const std::string suffix = digits.substr(digits.size() - 4);
  return std::string(digits.size() - 4, '*') + suffix;
}

std::string conversationKey(const std::string& leftPhone, const std::string& rightPhone) {
  std::string left = normalizePhoneDigits(leftPhone);
  std::string right = normalizePhoneDigits(rightPhone);
  if (right < left) std::swap(left, right);
  return left + "-" + right;
}

}  // namespace xpaychat
