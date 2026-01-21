
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
  ActivityIndicator,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiCall } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";

interface ChecklistItem {
  text: string;
  completed: boolean;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  type: "note" | "checklist";
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
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | undefined>(undefined);
  const [entryType, setEntryType] = useState<"note" | "checklist">("note");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([{ text: "", completed: false }]);

  useEffect(() => {
    if (user) {
      console.log("JournalScreen mounted, user authenticated, fetching entries");
      fetchEntries();
    }
  }, [user]);

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
    setEntryType("note");
    setChecklistItems([{ text: "", completed: false }]);
    setModalVisible(true);
  };

  const openEditModal = (entry: JournalEntry) => {
    console.log("User tapped to edit entry:", entry.id);
    setEditingEntry(entry);
    setTitle(entry.title);
    setSelectedMood(entry.mood);
    setEntryType(entry.type || "note");
    
    if (entry.type === "checklist") {
      try {
        const items = JSON.parse(entry.content) as ChecklistItem[];
        setChecklistItems(items);
        setContent("");
      } catch (error) {
        console.error("Error parsing checklist items:", error);
        setChecklistItems([{ text: "", completed: false }]);
      }
    } else {
      setContent(entry.content);
      setChecklistItems([{ text: "", completed: false }]);
    }
    
    setModalVisible(true);
  };

  const saveEntry = async () => {
    console.log("User tapped Save button", { title, entryType, mood: selectedMood });
    
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }

    let contentToSave = "";
    
    if (entryType === "note") {
      if (!content.trim()) {
        Alert.alert("Error", "Please enter some content");
        return;
      }
      contentToSave = content.trim();
    } else {
      const validItems = checklistItems.filter(item => item.text.trim() !== "");
      if (validItems.length === 0) {
        Alert.alert("Error", "Please add at least one checklist item");
        return;
      }
      contentToSave = JSON.stringify(validItems);
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
              content: contentToSave,
              mood: selectedMood,
              type: entryType,
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
            content: contentToSave,
            mood: selectedMood,
            type: entryType,
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

  const toggleChecklistItem = async (entryId: string, itemIndex: number) => {
    console.log("User toggled checklist item:", entryId, itemIndex);
    const entry = entries.find(e => e.id === entryId);
    if (!entry || entry.type !== "checklist") {
      return;
    }

    try {
      const items = JSON.parse(entry.content) as ChecklistItem[];
      items[itemIndex].completed = !items[itemIndex].completed;
      
      const updatedEntry = await apiCall<JournalEntry>(
        `/api/journal/entries/${entryId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            content: JSON.stringify(items),
          }),
        }
      );
      console.log("✅ Checklist item toggled:", updatedEntry);
      fetchEntries();
    } catch (error) {
      console.error("Error toggling checklist item:", error);
      Alert.alert("Error", "Failed to update checklist");
    }
  };

  const addChecklistItem = () => {
    console.log("User tapped Add Item button");
    setChecklistItems([...checklistItems, { text: "", completed: false }]);
  };

  const updateChecklistItem = (index: number, text: string) => {
    const newItems = [...checklistItems];
    newItems[index].text = text;
    setChecklistItems(newItems);
  };

  const removeChecklistItem = (index: number) => {
    console.log("User removed checklist item:", index);
    if (checklistItems.length > 1) {
      const newItems = checklistItems.filter((_, i) => i !== index);
      setChecklistItems(newItems);
    }
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

  const renderEntryContent = (entry: JournalEntry) => {
    if (entry.type === "checklist") {
      try {
        const items = JSON.parse(entry.content) as ChecklistItem[];
        const completedCount = items.filter(item => item.completed).length;
        const totalCount = items.length;
        const completedText = `${completedCount}/${totalCount} completed`;
        
        return (
          <View>
            {items.slice(0, 3).map((item, index) => {
              const itemText = item.text;
              return (
                <View key={index} style={styles.checklistPreviewItem}>
                  <TouchableOpacity
                    onPress={() => toggleChecklistItem(entry.id, index)}
                    style={styles.checkbox}
                  >
                    {item.completed && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={16}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.checklistPreviewText,
                      item.completed && styles.checklistPreviewTextCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {itemText}
                  </Text>
                </View>
              );
            })}
            {items.length > 3 && (
              <Text style={styles.moreItemsText}>
                +{items.length - 3} more items
              </Text>
            )}
            <Text style={styles.checklistProgress}>{completedText}</Text>
          </View>
        );
      } catch (error) {
        console.error("Error rendering checklist:", error);
        return <Text style={styles.entryContent}>Invalid checklist data</Text>;
      }
    } else {
      const contentText = entry.content;
      return (
        <Text style={styles.entryContent} numberOfLines={3}>
          {contentText}
        </Text>
      );
    }
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redirect to auth screen if not logged in
  if (!user) {
    console.log("User not authenticated, redirecting to auth screen");
    return <Redirect href="/auth" />;
  }

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
          entries.map((entry) => (
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
                  {entry.type === "checklist" && (
                    <View style={styles.checklistBadge}>
                      <IconSymbol
                        ios_icon_name="checklist"
                        android_material_icon_name="check-circle"
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                  )}
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
              {renderEntryContent(entry)}
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
                <Text style={styles.label}>Entry Type</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      entryType === "note" && styles.typeButtonSelected,
                    ]}
                    onPress={() => {
                      console.log("User selected note type");
                      setEntryType("note");
                    }}
                  >
                    <IconSymbol
                      ios_icon_name="doc.text.fill"
                      android_material_icon_name="description"
                      size={20}
                      color={entryType === "note" ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        entryType === "note" && styles.typeButtonTextSelected,
                      ]}
                    >
                      Note
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      entryType === "checklist" && styles.typeButtonSelected,
                    ]}
                    onPress={() => {
                      console.log("User selected checklist type");
                      setEntryType("checklist");
                    }}
                  >
                    <IconSymbol
                      ios_icon_name="checklist"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={entryType === "checklist" ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        entryType === "checklist" && styles.typeButtonTextSelected,
                      ]}
                    >
                      Checklist
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {entryType === "note" ? (
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
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Checklist Items</Text>
                  {checklistItems.map((item, index) => {
                    const itemText = item.text;
                    return (
                      <View key={index} style={styles.checklistItemContainer}>
                        <View style={styles.checkboxPlaceholder} />
                        <TextInput
                          style={styles.checklistItemInput}
                          value={itemText}
                          onChangeText={(text) => updateChecklistItem(index, text)}
                          placeholder={`Item ${index + 1}`}
                          placeholderTextColor={colors.textSecondary}
                        />
                        {checklistItems.length > 1 && (
                          <TouchableOpacity
                            onPress={() => removeChecklistItem(index)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <IconSymbol
                              ios_icon_name="minus.circle.fill"
                              android_material_icon_name="remove-circle"
                              size={24}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  <TouchableOpacity style={styles.addItemButton} onPress={addChecklistItem}>
                    <IconSymbol
                      ios_icon_name="plus.circle.fill"
                      android_material_icon_name="add-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.addItemButtonText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  checklistBadge: {
    marginLeft: 8,
  },
  entryContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  checklistPreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checklistPreviewText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  checklistPreviewTextCompleted: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  moreItemsText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  checklistProgress: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 4,
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
  typeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  typeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typeButtonTextSelected: {
    color: colors.primary,
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
  checklistItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  checkboxPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checklistItemInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  addItemButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
});
