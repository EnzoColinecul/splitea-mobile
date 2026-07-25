import apiClient from "@/api/api-client";
import { expensesApi } from "@/api/expenses";
import { paymentsApi } from "@/api/payments";
import { groupsApi } from "@/api/social";
import { Button, Card, Typography } from "@/components/common/shared";
import { BorderRadius, Colors, Spacing } from "@/theme/theme";
import {
  EligibilityProvider,
  Expense,
  ExpenseSplit,
  PaymentSettlement,
  User,
} from "@/types";
import { GlobalEvents, PaymentReceivedPayload } from "@/utils/events";
import {
  buildMemberLookup,
  formatCurrency,
  getDisplayName,
  getExpenseParticipantAmount,
} from "@/utils/expense-display";
import { openAuthUrl } from "@/utils/open-auth-url";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Download,
  Expand,
  FileImage,
  Info,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ReceiptZigzag = ({
  color = Colors.white,
  position = "bottom",
}: {
  color?: string;
  position?: "top" | "bottom";
}) => {
  const toothWidth = 20;
  const count = Math.ceil(SCREEN_WIDTH / toothWidth) + 1;
  return (
    <View
      style={[
        styles.zigzagContainer,
        position === "top" ? styles.zigzagTop : styles.zigzagBottom,
      ]}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.zigzagTooth,
            { backgroundColor: color, left: i * toothWidth - toothWidth / 2 },
            position === "top" ? { bottom: -10 } : { top: -10 },
          ]}
        />
      ))}
    </View>
  );
};

const BarcodeFooter = () => (
  <View style={styles.barcodeContainer}>
    {[1, 2, 4, 2, 1, 3, 2, 4, 1, 2, 1, 4, 2, 3].map((w, i) => (
      <View key={i} style={[styles.barcodeBar, { width: w }]} />
    ))}
  </View>
);

const Perforation = () => (
  <View style={styles.perforationRow}>
    {Array.from({ length: 40 }).map((_, i) => (
      <View key={i} style={styles.perforationDot} />
    ))}
  </View>
);

export default function ExpenseViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    expenseId?: string;
    expense?: string;
  }>();
  const initialExpense = useMemo(() => {
    if (!params.expense) return null;

    try {
      return JSON.parse(params.expense) as Expense;
    } catch (error) {
      return null;
    }
  }, [params.expense]);

  const [expense, setExpense] = useState<Expense | null>(initialExpense);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [receiptPresignedUrl, setReceiptPresignedUrl] = useState<string | null>(
    null,
  );
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Payment state
  const [myDebtorSplit, setMyDebtorSplit] = useState<ExpenseSplit | null>(null);
  const [stripeEligibility, setStripeEligibility] =
    useState<EligibilityProvider | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
  const [reasonVisible, setReasonVisible] = useState(false);
  const reasonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<"confirming" | "done">(
    "confirming",
  );
  const [settlementStatus, setSettlementStatus] = useState<
    PaymentSettlement["status"] | "timeout" | null
  >(null);

  const showReason = () => {
    if (reasonTimer.current) clearTimeout(reasonTimer.current);
    setReasonVisible(true);
    reasonTimer.current = setTimeout(() => setReasonVisible(false), 3000);
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadExpense = async () => {
        const expenseId = initialExpense?.expense_id || params.expenseId;

        try {
          const [profileRes, listRes] = await Promise.all([
            apiClient.get<User>("/user/profile"),
            expensesApi.listUserExpenses(),
          ]);

          if (cancelled) return;

          setCurrentUser(profileRes.data);

          const resolvedExpense =
            (listRes.expenses || []).find(
              (item) => item.expense_id === expenseId,
            ) || null;

          if (!resolvedExpense) {
            if (!initialExpense) {
              Alert.alert(
                "Expense not found",
                "We could not load this expense.",
              );
              router.back();
              return;
            }
            // Keep optimistic copy from params if server hasn't caught up yet
            return;
          }

          setExpense(resolvedExpense);

          if (resolvedExpense.group_id) {
            const groupUsersRes = await groupsApi.getUsers(
              resolvedExpense.group_id,
            );
            if (!cancelled) {
              setMembers(groupUsersRes.users || []);
            }
          }
        } catch (error) {
          console.error(error);
          if (!cancelled && !initialExpense) {
            Alert.alert("Error", "Could not load expense details.");
            router.back();
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      loadExpense();

      return () => {
        cancelled = true;
      };
    }, [initialExpense, params.expenseId, router]),
  );

  const memberLookup = useMemo(
    () => buildMemberLookup(members, currentUser),
    [members, currentUser],
  );
  const paidByName = expense
    ? getDisplayName(expense.paid_by, memberLookup)
    : "Member";

  // Refresh expense when a push reports a payment landed on it
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      GlobalEvents.PAYMENT_RECEIVED,
      (payload: PaymentReceivedPayload) => {
        if (!expense || payload?.expense_id !== expense.expense_id) return;
        expensesApi
          .listUserExpenses()
          .then((res) => {
            const updated = (res.expenses || []).find(
              (e) => e.expense_id === expense.expense_id,
            );
            if (updated) setExpense(updated);
          })
          .catch(() => {});
      },
    );
    return () => sub.remove();
  }, [expense]);

  // Derive the current user's debtor split and check payment eligibility
  useEffect(() => {
    if (!expense || !currentUser) return;

    // User is a debtor if someone else paid and they have an unpaid split
    if (expense.paid_by === currentUser.user_id) return;

    const split =
      expense.splits?.find(
        (s) => s.user_id === currentUser.user_id && s.is_paid !== "true",
      ) ?? null;

    setMyDebtorSplit(split);

    if (!split) return;

    let cancelled = false;
    setEligibilityLoading(true);

    paymentsApi
      .getEligibility(split.expense_split_id)
      .then((data) => {
        if (cancelled) return;
        const provider =
          data.providers.find((p) => p.provider === "stripe") ?? null;
        setStripeEligibility(provider);
      })
      .catch(() => {
        // Silently fail — payment section simply won't render
      })
      .finally(() => {
        if (!cancelled) setEligibilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expense, currentUser]);

  const pollSettlement = async (
    expenseSplitId: string,
  ): Promise<PaymentSettlement["status"] | "timeout"> => {
    const MAX_ATTEMPTS = 15;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      try {
        const data = await paymentsApi.getSettlement(expenseSplitId);
        if (data.status !== "pending") return data.status;
      } catch {
        // Continue polling on transient errors
      }
    }
    return "timeout";
  };

  const handlePayWithCard = async () => {
    if (!myDebtorSplit || startingPayment) return;

    try {
      setStartingPayment(true);
      const { checkout_url } = await paymentsApi.settle(
        myDebtorSplit.expense_split_id,
      );
      setStartingPayment(false);

      await openAuthUrl(checkout_url);

      // Browser closed — show modal and poll to determine actual outcome
      setSettlementStatus(null);
      setPaymentPhase("confirming");
      setPaymentModalVisible(true);

      const finalStatus = await pollSettlement(myDebtorSplit.expense_split_id);

      // User cancelled in Stripe Checkout → dismiss modal silently
      if (finalStatus === "canceled") {
        setPaymentModalVisible(false);
        setPaymentPhase("confirming");
        return;
      }

      setSettlementStatus(finalStatus);
      setPaymentPhase("done");

      // Reload expense so split.is_paid reflects new state
      if (finalStatus === "succeeded") {
        try {
          const refreshed = await expensesApi.listUserExpenses();
          const updated = (refreshed.expenses || []).find(
            (e) => e.expense_id === expense?.expense_id,
          );
          if (updated) setExpense(updated);
        } catch {
          /* best-effort */
        }
      }
    } catch (error: any) {
      setStartingPayment(false);
      const msg =
        error?.response?.data?.detail?.message ??
        "Could not start payment. Please try again.";
      Alert.alert("Payment error", msg);
    }
  };

  const handleClosePaymentModal = () => {
    setPaymentModalVisible(false);
    setSettlementStatus(null);
    setPaymentPhase("confirming");
  };

  const handleDeleteExpense = () => {
    if (!expense || deleting) return;
    Alert.alert(
      "Delete expense",
      "This will be recorded in the group activity. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              await expensesApi.deleteExpense(expense.expense_id);
              router.back();
            } catch (error: any) {
              const detail =
                error?.response?.data?.detail ||
                error?.message ||
                "Could not delete this expense.";
              Alert.alert("Error", detail);
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleOpenReceipt = async () => {
    if (!expense?.receipt_url) return;
    setReceiptVisible(true);
    setReceiptLoading(true);
    try {
      const url = await expensesApi.getReceiptUrl(expense.receipt_url);
      setReceiptPresignedUrl(url);
    } catch {
      Alert.alert("Error", "Could not load receipt image.");
      setReceiptVisible(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptVisible(false);
    setReceiptPresignedUrl(null);
  };

  const handleDownloadReceipt = async () => {
    if (!receiptPresignedUrl) return;
    try {
      await Linking.openURL(receiptPresignedUrl);
    } catch {
      Alert.alert("Error", "Could not open receipt for download.");
    }
  };

  if (loading || !expense) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>
          Expense Details
        </Typography.SubHeader>
        {currentUser && expense && currentUser.user_id === expense.paid_by ? (
          <TouchableOpacity
            onPress={handleDeleteExpense}
            style={styles.deleteBtn}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <Trash2 size={22} color={Colors.danger} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Card (Receipt Shape) */}
        <View style={styles.receiptWrapper}>
          <ReceiptZigzag position="top" />

          <View style={styles.heroCardPremium}>
            <View style={styles.receiptHeader}>
              <Typography.Caption style={styles.receiptLabel}>
                RECEIPT
              </Typography.Caption>
              <Typography.Caption style={styles.receiptStars}>
                ***
              </Typography.Caption>
            </View>

            <View style={styles.heroTitleContainerCenter}>
              <Typography.SubHeader style={styles.expenseTitleReceipt}>
                {expense.title}
              </Typography.SubHeader>
              <Typography.Caption style={styles.expenseDateReceipt}>
                {new Date(
                  expense.expense_date || expense.created_at,
                ).toLocaleDateString(undefined, { dateStyle: "long" })}
              </Typography.Caption>
            </View>

            <Perforation />

            <View style={styles.amountContainerReceipt}>
              <Typography.Caption style={styles.totalLabel}>
                TOTAL:
              </Typography.Caption>
              <Typography.Header style={styles.amountTextReceipt}>
                {formatCurrency(Number(expense.total_amount) || 0)}
              </Typography.Header>
            </View>

            <Perforation />

            <View style={styles.metaGridReceipt}>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>
                  PAID BY
                </Typography.Caption>
                <Typography.Body
                  style={styles.metaValueReceipt}
                  numberOfLines={1}
                >
                  {paidByName}
                </Typography.Body>
              </View>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>
                  CURRENCY
                </Typography.Caption>
                <Typography.Body style={styles.metaValueReceipt}>
                  {expense.currency || "ARS"}
                </Typography.Body>
              </View>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>
                  SPLIT TYPE
                </Typography.Caption>
                <Typography.Body style={styles.metaValueReceipt}>
                  {expense.split_type?.replace("_", " ") || "Equally"}
                </Typography.Body>
              </View>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>
                  YOUR SHARE
                </Typography.Caption>
                <Typography.Body
                  style={[styles.metaValueReceipt, { color: Colors.secondary }]}
                >
                  {currentUser
                    ? formatCurrency(
                        getExpenseParticipantAmount(
                          expense,
                          currentUser.user_id,
                        ),
                      )
                    : formatCurrency(0)}
                </Typography.Body>
              </View>
            </View>

            <Typography.Caption style={styles.receiptStarsBottom}>
              ***
            </Typography.Caption>
            <BarcodeFooter />
          </View>

          <ReceiptZigzag position="bottom" />
        </View>

        {expense.description ? (
          <Card style={styles.sectionCardPremium}>
            <Typography.SectionHeader style={styles.premiumSectionHeader}>
              Description
            </Typography.SectionHeader>
            <Typography.Body style={{ marginTop: Spacing.xs }}>
              {expense.description}
            </Typography.Body>
          </Card>
        ) : null}

        <Card style={styles.sectionCardPremium}>
          <View style={styles.sectionHeaderRow}>
            <Typography.SectionHeader style={styles.premiumSectionHeader}>
              Split Details
            </Typography.SectionHeader>
            <Users size={18} color={Colors.primary} />
          </View>

          <View style={styles.splitList}>
            {expense.splits?.map((split, idx) => {
              const displayName = getDisplayName(split.user_id, memberLookup);
              const initial = displayName.charAt(0).toUpperCase() || "?";
              const isPayer = split.user_id === expense.paid_by;

              return (
                <View key={split.expense_split_id}>
                  <View style={styles.splitRowModern}>
                    <View style={styles.splitAvatar}>
                      <Typography.Body style={styles.avatarText}>
                        {initial}
                      </Typography.Body>
                    </View>
                    <View style={styles.splitInfo}>
                      <Typography.Body style={styles.splitNameText}>
                        {displayName}
                      </Typography.Body>
                      <Typography.Caption numberOfLines={1}>
                        {isPayer
                          ? "Paid for the entire expense"
                          : "Owes part of the split"}
                      </Typography.Caption>
                    </View>
                    <Typography.Body style={styles.splitAmountText}>
                      {formatCurrency(Number(split.amount_owed) || 0)}
                    </Typography.Body>
                  </View>
                  {idx < (expense.splits?.length || 0) - 1 ? (
                    <View style={styles.listDivider} />
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Pay with Card — only shown when user is a debtor with an eligible split */}
        {myDebtorSplit && (
          <Card style={styles.sectionCardPremium}>
            <View style={styles.sectionHeaderRow}>
              <Typography.SectionHeader style={styles.premiumSectionHeader}>
                Pay with Card
              </Typography.SectionHeader>
              <CreditCard size={18} color={Colors.primary} />
            </View>

            {eligibilityLoading ? (
              <View style={styles.paymentLoadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Typography.Caption>
                  Checking payment options…
                </Typography.Caption>
              </View>
            ) : stripeEligibility?.enabled ? (
              <View style={styles.paymentReadyRow}>
                <Typography.Caption
                  style={{ color: Colors.textSecondary, flex: 1 }}
                >
                  Pay your share of{" "}
                  {formatCurrency(Number(myDebtorSplit.amount_owed))} securely
                  via Stripe.
                </Typography.Caption>
                <Button
                  title={startingPayment ? "Opening…" : "Pay now"}
                  variant="primary"
                  onPress={handlePayWithCard}
                  disabled={startingPayment}
                  style={styles.payNowButton}
                />
              </View>
            ) : stripeEligibility && !stripeEligibility.enabled ? (
              <View style={styles.payNowDisabledRow}>
                <View
                  style={[
                    styles.payNowDisabledContent,
                    styles.payNowDisabledOpacity,
                  ]}
                >
                  <CreditCard
                    size={16}
                    color={Colors.primary}
                    strokeWidth={2}
                  />
                  <Typography.Body style={styles.payNowDisabledText}>
                    Pay now
                  </Typography.Body>
                </View>
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={showReason}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Info size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : null}
          </Card>
        )}

        {expense.receipt_url ? (
          <TouchableOpacity activeOpacity={0.75} onPress={handleOpenReceipt}>
            <Card style={styles.sectionCardPremium}>
              <View style={styles.sectionHeaderRow}>
                <Typography.SectionHeader style={styles.premiumSectionHeader}>
                  Receipt
                </Typography.SectionHeader>
                <Expand size={16} color={Colors.primary} />
              </View>
              <View style={styles.receiptThumbRow}>
                <View style={styles.receiptThumbBox}>
                  <FileImage size={32} color={Colors.primary} />
                </View>
                <View style={styles.receiptThumbMeta}>
                  <Typography.Body style={styles.receiptThumbLabel}>
                    Receipt captured
                  </Typography.Body>
                  <Typography.Caption style={styles.receiptThumbHint}>
                    Tap to view full image
                  </Typography.Caption>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <Card style={styles.sectionCardPremium}>
            <Typography.SectionHeader style={styles.premiumSectionHeader}>
              Receipt
            </Typography.SectionHeader>
            <Typography.Caption style={{ marginTop: Spacing.xs }}>
              No receipt attached.
            </Typography.Caption>
          </Card>
        )}
      </ScrollView>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={
          paymentPhase === "done" ? handleClosePaymentModal : undefined
        }
      >
        <View style={styles.paymentModalBackdrop}>
          <View style={styles.paymentModalSheet}>
            {paymentPhase === "confirming" ? (
              <>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Typography.SubHeader style={styles.paymentModalTitle}>
                  Confirming payment…
                </Typography.SubHeader>
                <Typography.Caption style={styles.paymentModalCaption}>
                  This usually takes just a few seconds.
                </Typography.Caption>
              </>
            ) : settlementStatus === "succeeded" ? (
              <>
                <View
                  style={[
                    styles.paymentStatusIcon,
                    { backgroundColor: Colors.successSoft },
                  ]}
                >
                  <CheckCircle2 size={40} color={Colors.success} />
                </View>
                <Typography.SubHeader style={styles.paymentModalTitle}>
                  Payment confirmed
                </Typography.SubHeader>
                <Typography.Caption style={styles.paymentModalCaption}>
                  Your share has been marked as paid.
                </Typography.Caption>
                <Button
                  title="Done"
                  variant="primary"
                  onPress={handleClosePaymentModal}
                  style={styles.paymentModalBtn}
                />
              </>
            ) : settlementStatus === "failed" ? (
              <>
                <View
                  style={[
                    styles.paymentStatusIcon,
                    { backgroundColor: Colors.dangerSoft },
                  ]}
                >
                  <XCircle size={40} color={Colors.danger} />
                </View>
                <Typography.SubHeader style={styles.paymentModalTitle}>
                  Payment failed
                </Typography.SubHeader>
                <Typography.Caption style={styles.paymentModalCaption}>
                  The card was declined. You can try again with a different
                  card.
                </Typography.Caption>
                <Button
                  title="Close"
                  variant="outline"
                  onPress={handleClosePaymentModal}
                  style={styles.paymentModalBtn}
                />
              </>
            ) : (
              <>
                <Typography.SubHeader style={styles.paymentModalTitle}>
                  Payment processing
                </Typography.SubHeader>
                <Typography.Caption style={styles.paymentModalCaption}>
                  We'll update your balance once the payment is confirmed. You
                  can close this screen.
                </Typography.Caption>
                <Button
                  title="Close"
                  variant="outline"
                  onPress={handleClosePaymentModal}
                  style={styles.paymentModalBtn}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Receipt Modal */}
      <Modal
        visible={receiptVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseReceipt}
      >
        <View style={styles.receiptModalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.receiptModalClose}
            onPress={handleCloseReceipt}
          >
            <X size={28} color={Colors.white} />
          </TouchableOpacity>

          {/* Image area */}
          {receiptLoading ? (
            <ActivityIndicator size="large" color={Colors.white} />
          ) : receiptPresignedUrl ? (
            <Image
              source={{ uri: receiptPresignedUrl }}
              style={styles.receiptModalImage}
              resizeMode="contain"
            />
          ) : null}

          {/* Download bar */}
          {!receiptLoading && receiptPresignedUrl && (
            <TouchableOpacity
              style={styles.receiptDownloadBar}
              onPress={handleDownloadReceipt}
              activeOpacity={0.8}
            >
              <Download size={20} color={Colors.white} />
              <Text style={styles.receiptDownloadText}>Download Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {reasonVisible && (
        <TouchableOpacity
          style={styles.popoverBackdrop}
          activeOpacity={1}
          onPress={() => setReasonVisible(false)}
        >
          <View style={styles.popover}>
            <Info size={16} color={Colors.primary} strokeWidth={2} />
            <Typography.Caption style={styles.popoverText}>
              {stripeEligibility?.message ??
                "This person hasn't connected Stripe yet, so card payments aren't available."}
            </Typography.Caption>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 0,
    fontWeight: "700",
  },
  headerSpacer: { width: 36 },
  deleteBtn: { padding: Spacing.xs, width: 36, alignItems: "center" },
  scroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },

  receiptWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: Colors.white,
    overflow: "visible",
    marginHorizontal: Spacing.sm,
  },
  heroCardPremium: {
    padding: Spacing.xl,
    backgroundColor: "transparent",
    borderWidth: 0,
    gap: Spacing.lg,
    position: "relative",
    overflow: "visible",
  },
  zigzagContainer: {
    height: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  zigzagTop: { marginBottom: -6 },
  zigzagBottom: { marginTop: -6 },
  zigzagTooth: {
    width: 20,
    height: 20,
    transform: [{ rotate: "45deg" }],
    position: "absolute",
  },
  receiptHeader: { alignItems: "center", marginBottom: -Spacing.sm },
  receiptLabel: {
    fontWeight: "800",
    letterSpacing: 4,
    color: "#94A3B8",
    fontSize: 13,
  },
  receiptStars: { letterSpacing: 2, color: "#CBD5E1", marginTop: 2 },
  receiptStarsBottom: {
    textAlign: "center",
    letterSpacing: 8,
    color: "#CBD5E1",
    marginVertical: Spacing.sm,
  },
  heroTitleContainerCenter: { alignItems: "center", gap: 2 },
  expenseTitleReceipt: {
    textAlign: "center",
    fontWeight: "900",
    color: Colors.text,
    fontSize: 24,
    textTransform: "capitalize",
  },
  expenseDateReceipt: { textAlign: "center", color: Colors.textSecondary },

  amountContainerReceipt: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  totalLabel: { fontWeight: "700", fontSize: 16, color: Colors.textSecondary },
  amountTextReceipt: {
    fontSize: 48,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 0,
  },

  perforationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 1,
    overflow: "hidden",
  },
  perforationDot: {
    width: 5,
    height: 1.5,
    backgroundColor: "#F1F5F9",
    borderRadius: 1,
  },

  metaGridReceipt: { gap: Spacing.md },
  metaItemReceipt: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabelReceipt: {
    fontWeight: "700",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  metaValueReceipt: { fontWeight: "800", color: Colors.text, fontSize: 16 },

  barcodeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 32,
    gap: 1.5,
    opacity: 0.8,
  },
  barcodeBar: { backgroundColor: "#1E293B", height: "100%", borderRadius: 0.5 },
  metaLabelText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValueText: { fontWeight: "700", color: Colors.text, fontSize: 15 },

  sectionCardPremium: {
    padding: Spacing.xl,
    borderRadius: 24,
    backgroundColor: Colors.white,
    gap: Spacing.md,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  premiumSectionHeader: {
    marginBottom: 0,
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  splitList: { gap: 0 },
  splitRowModern: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  splitAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "700", color: Colors.primary },
  splitInfo: { flex: 1 },
  splitNameText: { fontWeight: "700", fontSize: 15, marginBottom: 2 },
  splitAmountText: { fontWeight: "700", color: Colors.secondary, fontSize: 16 },
  listDivider: { height: 1, backgroundColor: "#F1F5F9" },

  receiptThumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  receiptThumbBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptThumbMeta: { flex: 1, gap: 4 },
  receiptThumbLabel: { fontWeight: "700", fontSize: 15, color: Colors.text },
  receiptThumbHint: { color: Colors.primary, fontWeight: "600", fontSize: 13 },

  receiptModalContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptModalClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  receiptModalImage: { width: SCREEN_WIDTH, height: "80%" },
  receiptDownloadBar: {
    position: "absolute",
    bottom: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 32,
  },
  receiptDownloadText: { color: Colors.white, fontWeight: "700", fontSize: 16 },

  // Payment section styles
  paymentLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  paymentReadyRow: { gap: Spacing.md, marginTop: Spacing.xs },
  payNowButton: { width: "100%" },
  payNowDisabledRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.round,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  payNowDisabledContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    justifyContent: "center",
  },
  payNowDisabledOpacity: { opacity: 0.45 },
  payNowDisabledText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  infoBtn: { padding: Spacing.xs },
  popoverBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  popover: {
    position: "absolute",
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.text,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  popoverText: { color: Colors.white, lineHeight: 18, flex: 1 },

  // Payment modal styles
  paymentModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  paymentModalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 48,
    alignItems: "center",
    gap: Spacing.lg,
  },
  paymentStatusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentModalTitle: {
    textAlign: "center",
    color: Colors.text,
    marginBottom: 0,
    fontSize: 20,
  },
  paymentModalCaption: {
    textAlign: "center",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  paymentModalBtn: { width: "100%", marginTop: Spacing.sm },
});
