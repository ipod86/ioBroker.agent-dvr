import React from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import { TextField, Checkbox, FormControlLabel, Select, MenuItem, FormControl, InputLabel, FormHelperText, Typography, Box } from '@mui/material';

interface BaseProps {
    labelKey: string;
    helpKey?: string;
}

interface TextProps extends BaseProps {
    type: 'text' | 'password';
    value: string;
    onChange: (v: string) => void;
}

interface NumberProps extends BaseProps {
    type: 'number';
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
}

interface CheckboxProps extends BaseProps {
    type: 'checkbox';
    value: boolean;
    onChange: (v: boolean) => void;
}

interface SelectProps extends BaseProps {
    type: 'select';
    value: string;
    onChange: (v: string) => void;
    options: { value: string; labelKey: string }[];
}

type FieldProps = TextProps | NumberProps | CheckboxProps | SelectProps;

const FormField: React.FC<FieldProps> = (props) => {
    const label = I18n.t(props.labelKey);
    const help = props.helpKey ? I18n.t(props.helpKey) : '';

    if (props.type === 'checkbox') {
        return (
            <FormControl sx={{ display: 'block', mb: 1 }}>
                <FormControlLabel
                    control={<Checkbox checked={!!props.value} onChange={e => props.onChange(e.target.checked)} />}
                    label={label}
                />
                {help && <FormHelperText sx={{ ml: 4, mt: -0.5 }}>{help}</FormHelperText>}
            </FormControl>
        );
    }

    if (props.type === 'select') {
        return (
            <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                <InputLabel>{label}</InputLabel>
                <Select value={props.value ?? ''} label={label} onChange={e => props.onChange(e.target.value as string)}>
                    {props.options.map(o => (
                        <MenuItem key={o.value} value={o.value}>{I18n.t(o.labelKey)}</MenuItem>
                    ))}
                </Select>
                {help && <FormHelperText>{help}</FormHelperText>}
            </FormControl>
        );
    }

    if (props.type === 'number') {
        return (
            <TextField
                label={label}
                type="number"
                value={props.value ?? ''}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
                inputProps={{ min: props.min, max: props.max }}
                onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) props.onChange(v);
                }}
                helperText={help || ' '}
            />
        );
    }

    return (
        <TextField
            label={label}
            type={props.type === 'password' ? 'password' : 'text'}
            value={props.value ?? ''}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
            onChange={e => props.onChange(e.target.value)}
            helperText={help || ' '}
        />
    );
};

export const SectionHeader: React.FC<{ textKey: string }> = ({ textKey }) => (
    <Typography variant="h6" sx={{ mt: 2, mb: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
        {I18n.t(textKey)}
    </Typography>
);

export const ColorField: React.FC<{ labelKey: string; helpKey?: string; value: string; onChange: (v: string) => void }> = ({ labelKey, helpKey, value, onChange }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>{I18n.t(labelKey)}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input type="color" value={value || '#888888'} onChange={e => onChange(e.target.value)} style={{ width: 48, height: 32, cursor: 'pointer', border: 'none' }} />
            <TextField
                value={value ?? ''}
                size="small"
                sx={{ flex: 1 }}
                onChange={e => onChange(e.target.value)}
                placeholder="rgba(...) or #hex"
            />
        </Box>
        {helpKey && <FormHelperText>{I18n.t(helpKey)}</FormHelperText>}
    </Box>
);

export default FormField;
