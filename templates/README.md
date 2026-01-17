# Templates Directory

## DC-FORMAT.xlsx Template

The DC template has been created with the exact structure matching your GitHub repository requirements.

## Template Structure (Exact Cell Mapping):

### Customer Information (Right "To" block, Column C):
- **C3**: Full Name
- **C4**: Address Line 1 (cleaned Street Address + Landmark if present)
- **C5**: City
- **C6**: State - Postal Code
- **C7**: Country
- **C8**: Mobile Number

### Other Required Fields:
- **B12**: Today's date (DD/MM/YYYY format)
- **A16**: 1 (SL No)
- **B16**: "Merchandise" (Description)
- **C16**: Empty (HSN Code)
- **D16**: 1 (Quantity)
- **E16**: 0 (Unit Price)
- **F16**: 0 (Total)
- **F24**: 0 (Grand Total)

## Address Processing Rules:

1. **Name Removal**: If Street Address begins with customer name, remove that portion
2. **Address Lines**:
   - line2 = cleaned Street Address + ", " + Landmark (if landmark present)
   - line3 = City
   - line4 = "State/Province - PostalCode" if both present, else "State/Province PostalCode" (trimmed)
   - line5 = Country

## BlueDart Processing:

### Sequential Numbers:
- **Invoice Number**: Auto-generated with zero-padding (001, 002, etc.)
- **Reference Number**: Auto-generated with zero-padding (001, 002, etc.)
- Sequence continues from last used number across all files

### Required Columns (from uploaded data):
- Full Name → Consignee Name
- Street Address → Consignee Address1
- Landmark → Consignee Address2
- City → Consignee City
- State/Province → Consignee State
- Postal Code → Consignee Pincode
- Mobile Number → Consignee Telephone (cleaned)
- Email → Consignee Email
- Order ID → Customer Reference

### Default Values:
- Product Type: "DOX"
- Sub Product: "A"
- Pickup Date: Today's date
- All other columns remain blank as per template

## File Naming:

### BlueDart Output:
- Format: `BlueDart_DDMMYYYY_HHmmss.xlsx`
- Example: `BlueDart_09012026_143022.xlsx`

### DC Output:
- Format: `DC_<FullNameWithUnderscores>_YYYYMMDD.xlsx`
- Example: `DC_John_Doe_20260109.xlsx`

## Supported Input Formats:
- .xlsx (Excel)
- .xls (Legacy Excel)
- .csv (Comma Separated Values)

Maximum file size: 10MB