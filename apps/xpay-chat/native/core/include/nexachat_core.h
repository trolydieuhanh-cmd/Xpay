#pragma once

#include <string>

namespace xpaychat {

const char* coreVersion();
bool isLikelyPhone(const std::string& input);
std::string normalizePhoneDigits(const std::string& input);
std::string redactPhone(const std::string& input);
std::string conversationKey(const std::string& leftPhone, const std::string& rightPhone);

}  // namespace xpaychat
