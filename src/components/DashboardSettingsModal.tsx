import { View, Text, TouchableOpacity, Modal, Switch } from 'react-native';
import { useDashboardPrefsStore, DashboardCardConfig } from '../store/dashboardPrefsStore';
import { X, ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff } from 'lucide-react-native';

interface DashboardSettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

const cardIcons: Record<string, string> = {
    'active-alerts': '🔴',
    'analytics': '📊',
    'systems': '⚙️',
};

export function DashboardSettingsModal({ visible, onClose }: DashboardSettingsModalProps) {
    const { cards, setCardVisibility, moveCard, resetDefaults } = useDashboardPrefsStore();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end">
                {/* Backdrop */}
                <TouchableOpacity
                    className="flex-1"
                    activeOpacity={1}
                    onPress={onClose}
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                />

                {/* Sheet */}
                <View className="bg-gray-900 rounded-t-2xl border-t border-gray-800 px-4 pb-8 pt-3">
                    {/* Handle */}
                    <View className="w-10 h-1 bg-gray-700 rounded-full self-center mb-4" />

                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-5">
                        <Text className="text-white font-black text-base tracking-wider">CUSTOMIZE DASHBOARD</Text>
                        <TouchableOpacity onPress={onClose} className="p-1">
                            <X color="#737373" size={20} />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-gray-500 text-xs mb-4">
                        Toggle visibility and reorder cards. Changes are saved automatically.
                    </Text>

                    {/* Card list */}
                    {cards.map((card, index) => (
                        <CardRow
                            key={card.id}
                            card={card}
                            index={index}
                            total={cards.length}
                            onToggle={() => setCardVisibility(card.id, !card.visible)}
                            onMoveUp={() => moveCard(card.id, 'up')}
                            onMoveDown={() => moveCard(card.id, 'down')}
                        />
                    ))}

                    {/* Reset */}
                    <TouchableOpacity
                        className="mt-4 flex-row items-center justify-center py-3 rounded-lg border border-gray-800"
                        onPress={() => { resetDefaults(); }}
                    >
                        <RotateCcw color="#737373" size={14} style={{ marginRight: 8 }} />
                        <Text className="text-gray-400 text-sm font-bold tracking-wider">RESET TO DEFAULTS</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function CardRow({
    card,
    index,
    total,
    onToggle,
    onMoveUp,
    onMoveDown,
}: {
    card: DashboardCardConfig;
    index: number;
    total: number;
    onToggle: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    const isFirst = index === 0;
    const isLast = index === total - 1;

    return (
        <View className="flex-row items-center py-3 border-b border-gray-800/50">
            {/* Reorder buttons */}
            <View style={{ width: 32, marginRight: 10, gap: 2 }}>
                <TouchableOpacity
                    onPress={onMoveUp}
                    disabled={isFirst}
                    style={{ opacity: isFirst ? 0.2 : 1, alignItems: 'center' }}
                >
                    <ChevronUp color="#737373" size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onMoveDown}
                    disabled={isLast}
                    style={{ opacity: isLast ? 0.2 : 1, alignItems: 'center' }}
                >
                    <ChevronDown color="#737373" size={16} />
                </TouchableOpacity>
            </View>

            {/* Label */}
            <Text className="text-lg" style={{ marginRight: 8 }}>{cardIcons[card.id]}</Text>
            <Text className={`flex-1 text-base font-bold ${card.visible ? 'text-white' : 'text-gray-600'}`}>
                {card.label}
            </Text>

            {/* Visibility toggle */}
            <Switch
                value={card.visible}
                onValueChange={onToggle}
                trackColor={{ false: '#333', true: '#10b98140' }}
                thumbColor={card.visible ? '#10b981' : '#737373'}
            />
        </View>
    );
}
