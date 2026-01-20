
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiCall } from "@/utils/api";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  createdAt: string;
  updatedAt: string;
}

const moodEmojis: { [key: string]: string } = {
  happy: "😊",
  sad: "😢",
  neutral: "😐",
  excited: "🤩",
  anxious: "😰",
};

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | undefined>(undefined);

  useEffect(() => {
    console.log("JournalScreen mounted, fetching entries");
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    console.log("Fetching journal entries from backend");
    try {
      const data = await apiCall<JournalEntry[]>('/api/journal/entries', {
        method: 'GET',
      });
      console.log("✅ Fetched entries:", data);
      setEntries(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching entries:", error);
      Alert.alert("Error", "Failed to load journal entries");
      setLoading(false);
    }
  };

  const openNewEntryModal = () => {
    console.log("User tapped New Entry button");
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setSelectedMood(undefined);
    setModalVisible(true);
  };

  const openEditModal = (entry: JournalEntry) => {
    console.log("User tapped to edit entry:", entry.id);
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setSelectedMood(entry.mood);
    setModalVisible(true);
  };

  const saveEntry = async () => {
    console.log("User tapped Save button", { title, content, mood: selectedMood });
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in both title and content");
      return;
    }

    try {
      if (editingEntry) {
        console.log("Updating existing entry:", editingEntry.id);
        const updatedEntry = await apiCall<JournalEntry>(
          `/api/journal/entries/${editingEntry.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: title.trim(),
              content: content.trim(),
              mood: selectedMood,
            }),
          }
        );
        console.log("✅ Entry updated:", updatedEntry);
      } else {
        console.log("Creating new entry");
        const newEntry = await apiCall<JournalEntry>('/api/journal/entries', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            mood: selectedMood,
          }),
        });
        console.log("✅ Entry created:", newEntry);
      }
      setModalVisible(false);
      fetchEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "Failed to save entry");
    }
  };

  const deleteEntry = async (id: string) => {
    console.log("User requested to delete entry:", id);
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("User confirmed deletion of entry:", id);
            try {
              const result = await apiCall<{ success: boolean }>(
                `/api/journal/entries/${id}`,
                {
                  method: 'DELETE',
                  body: JSON.stringify({}),
                }
              );
              console.log("✅ Entry deleted:", result);
              fetchEntries();
            } catch (error) {
              console.error("Error deleting entry:", error);
              Alert.alert("Error", "Failed to delete entry");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Journal</Text>
        <TouchableOpacity style={styles.addButton} onPress={openNewEntryModal}>
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={28}
            color={colors.card}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="book.fill"
              android_material_icon_name="menu-book"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>Tap the + button to create your first journal entry</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryCard}
              onPress={() => openEditModal(entry)}
              activeOpacity={0.7}
            >
              <View style={styles.entryHeader}>
                <View style={styles.entryTitleRow}>
                  {entry.mood && (
                    <Text style={styles.moodEmoji}>{moodEmojis[entry.mood]}</Text>
                  )}
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {entry.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteEntry(entry.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol
                    ios_icon_name="trash.fill"
                    android_material_icon_name="delete"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.entryContent} numberOfLines={3}>
                {entry.content}
              </Text>
              <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent} edges={["top", "bottom"]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingEntry ? "Edit Entry" : "New Entry"}
              </Text>
              <TouchableOpacity onPress={saveEntry}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Give your entry a title..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>How are you feeling?</Text>
                <View style={styles.moodContainer}>
                  {Object.entries(moodEmojis).map(([mood, emoji]) => (
                    <TouchableOpacity
                      key={mood}
                      style={[
                        styles.moodButton,
                        selectedMood === mood && styles.moodButtonSelected,
                      ]}
                      onPress={() => {
                        console.log("User selected mood:", mood);
                        setSelectedMood(mood);
                      }}
                    >
                      <Text style={styles.moodButtonEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Content</Text>
                <TextInput
                  style={styles.contentInput}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Write your thoughts..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "Georgia",
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  entryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    fontFamily: "Georgia",
  },
  entryContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  modalScroll: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: colors.text,
    fontFamily: "Georgia",
  },
  moodContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  moodButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  moodButtonEmoji: {
    fontSize: 28,
  },
  contentInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    minHeight: 200,
    lineHeight: 24,
  },
});
