import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MessageType {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  type: "text" | "image";
}

const mockMessages: MessageType[] = [
  {
    id: "1",
    text: "Hey! How are you doing today?",
    timestamp: "10:30 AM",
    isSent: false,
    type: "text",
  },
  {
    id: "2",
    text: "I'm doing great! Just working on some projects. How about you?",
    timestamp: "10:32 AM",
    isSent: true,
    type: "text",
  },
  {
    id: "3",
    text: "That sounds awesome! I'd love to hear more about it.",
    timestamp: "10:33 AM",
    isSent: false,
    type: "text",
  },
  {
    id: "4",
    text: "Sure! It's a React Native app with some cool features. I'll show you later!",
    timestamp: "10:35 AM",
    isSent: true,
    type: "text",
  },
  {
    id: "5",
    text: "Looking forward to it! 😊",
    timestamp: "10:36 AM",
    isSent: false,
    type: "text",
  },
];

const MessageBubble = ({ message }: { message: MessageType }) => {
  const isOutgoing = message.isSent;

  return (
    <View
      className={`flex-row mb-4 ${isOutgoing ? "justify-end" : "justify-start"}`}
    >
      <View
        className={`max-w-[75%] ${isOutgoing ? "items-end" : "items-start"}`}
      >
        <View
          className={`px-4 py-3 rounded-3xl ${
            isOutgoing
              ? "bg-orange-500 rounded-br-lg"
              : "bg-gray-100 rounded-bl-lg"
          }`}
        >
          <Text
            className={`text-base ${
              isOutgoing ? "text-white" : "text-zinc-800"
            }`}
          >
            {message.text}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 mt-1 px-2">
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
};

const Message = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>(mockMessages);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: MessageType = {
        id: Date.now().toString(),
        text: message.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isSent: true,
        type: "text",
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessage("");

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Sarah Johnson</Text>
          <View style={{ width: 24 }} />
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
        <View className="px-4 py-3 border-t border-gray-100 bg-white">
          <View className="flex flex-row items-center gap-x-3">
            <TouchableOpacity className="p-2">
              <Ionicons name="gift" size={24} color="#F59E0B" />
            </TouchableOpacity>
            <View className="flex-1 bg-gray-100 rounded-full h-14 px-4 flex flex-row items-center">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 text-base text-gray-900"
                maxLength={1000}
                style={{
                  color: "#111827",
                  fontSize: 14,
                }}
                enablesReturnKeyAutomatically={true}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />
            </View>
            <TouchableOpacity
              onPress={sendMessage}
              className={`rounded-full p-2 ${message.trim() ? "bg-blue-500" : "bg-gray-300"}`}
            >
              <Ionicons
                name="send"
                size={20}
                color={message.trim() ? "white" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Message;
