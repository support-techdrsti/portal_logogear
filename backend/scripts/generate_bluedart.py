#!/usr/bin/env python3
"""
BlueDart Generation Script for Logogear Portal
Based on the working Python script provided by user
"""

import os
import sys
import json
import csv
import pandas as pd
from datetime import datetime

def generate_bluedart_file(csv_file_path, output_dir, counter_dir):
    """
    Generate BlueDart file from CSV data using the exact working logic
    Args:
        csv_file_path: Path to input CSV file
        output_dir: Directory to save the generated BlueDart file
        counter_dir: Directory to store the persistent counter file
    Returns: dict with success status and file path
    """
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # ====== CONSTANTS ======
        BILLING_AREA = "BLR"
        BILLING_CUSTOMER_CODE = "204455"
        PICKUP_TIME = "1800"
        SHIPPER_NAME = "Logogear Solution LLP"
        PICKUP_ADDRESS = "Mico Layout Begur road"
        PICKUP_PIN = "560068"
        PACK_TYPE = "X"
        PIECE_COUNT = 1
        REGISTER_PICKUP = "TRUE"
        TO_PAY_CUSTOMER = ""
        SENDER = "Logogear"
        SENDER_MOBILE = "9035636626"
        
        # ====== PREPARE OUTPUT PATH ======
        today = datetime.today()
        pickup_date = today.strftime("%d/%m/%Y")   # dd/MM/yyyy
        today_folder = today.strftime("%d%m%Y")    # ddmmyyyy
        
        # ====== READ SOURCE CSV ======
        df_src = pd.read_csv(csv_file_path)
        if df_src.shape[0] == 0:
            raise ValueError("CSV has no data rows.")
        
        print(f"[SUCCESS] Loaded {len(df_src)} rows from source")
        print("[INFO] Columns:", df_src.columns.tolist())
        
        # ====== LOAD LAST USED REF NO (PERSISTENT) ======
        counter_file = os.path.join(counter_dir, "ref_counter.txt")
        if os.path.isfile(counter_file):
            with open(counter_file, "r", encoding="utf-8") as f:
                last_used = f.read().strip()
            try:
                last_ref_no = int(last_used)
            except ValueError:
                last_ref_no = 0
        else:
            last_ref_no = 0  # first time: start from 0
        
        print(f"[INFO] Last used reference number: {last_ref_no:03d}")
        
        rows_out = []
        current_ref_no = last_ref_no
        
        for idx, row in df_src.iterrows():
            try:
                current_ref_no += 1  # increment for each record
                
                full_name = str(row["Full Name"]).strip()
                email = str(row["Email"]).strip()
                street = str(row["Street Address"]).strip()
                landmark = str(row.get("Landmark", "")).strip()
                
                # Clean up landmark - remove 'nan' values
                if landmark.lower() == 'nan' or landmark == '':
                    landmark = ""
                
                # Build delivery address - clean format without newlines
                # Remove any newlines, tabs, and extra spaces
                street = street.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                landmark = landmark.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                
                delivery_address = street
                if landmark:
                    delivery_address = f"{street}, {landmark}"
                
                # Clean up the delivery address - remove multiple spaces
                delivery_address = ' '.join(delivery_address.split())
                
                mobile = str(row["Mobile Number"]).strip()
                phone = mobile
                pincode = str(row["Postal Code"]).strip()
                
                # Reference / Invoice like LGS-INV-001, LGS-INV-002, ...
                ref_text = f"LGS-INV-{current_ref_no:03d}"
                
                out_row = {
                    "Reference No": ref_text,
                    "Billing Area": BILLING_AREA,
                    "Billing Customer Code": BILLING_CUSTOMER_CODE,
                    "Pickup Date": pickup_date,
                    "Pickup Time": PICKUP_TIME,
                    "Shipper Name": SHIPPER_NAME,
                    "Pickup address": PICKUP_ADDRESS,
                    "Pickup pincode": PICKUP_PIN,
                    "Company Name": full_name,
                    "Delivery address": delivery_address,
                    "Delivery Pincode": pincode,
                    "Product Code": "",
                    "Product Type": "",
                    "Pack Type": PACK_TYPE,
                    "Piece Count": PIECE_COUNT,
                    "Actual Weight": "",
                    "Declared Value": "",
                    "Register Pickup": REGISTER_PICKUP,
                    "Length": "",
                    "Breadth": "",
                    "Height": "",
                    "To Pay Customer": TO_PAY_CUSTOMER,
                    "Sender": SENDER,
                    "Sender mobile": SENDER_MOBILE,
                    "Receiver Telephone": phone,
                    "Receiver mobile": mobile,
                    "Receiver Name": full_name,
                    "Invoice No": ref_text,
                    "Special Instruction": "",
                    "Commodity Detail 1": "",
                    "Commodity Detail 2": "",
                    "Commodity Detail 3": "",
                }
                
                rows_out.append(out_row)
                print(f"[PROCESSED] {idx + 1}: {full_name} -> {ref_text}")
                
            except Exception as e:
                print(f"[ERROR] Error processing row {idx + 1}: {str(e)}")
                continue
        
        # ====== SAVE CSV ======
        df_out = pd.DataFrame(rows_out, columns=[
            "Reference No",
            "Billing Area", 
            "Billing Customer Code",
            "Pickup Date",
            "Pickup Time",
            "Shipper Name",
            "Pickup address",
            "Pickup pincode",
            "Company Name",
            "Delivery address",
            "Delivery Pincode",
            "Product Code",
            "Product Type",
            "Pack Type",
            "Piece Count",
            "Actual Weight",
            "Declared Value",
            "Register Pickup",
            "Length",
            "Breadth",
            "Height",
            "To Pay Customer",
            "Sender",
            "Sender mobile",
            "Receiver Telephone",
            "Receiver mobile",
            "Receiver Name",
            "Invoice No",
            "Special Instruction",
            "Commodity Detail 1",
            "Commodity Detail 2",
            "Commodity Detail 3",
        ])
        
        out_file_name = f"Bluedart_AWB_{today_folder}.csv"
        out_full_path = os.path.join(output_dir, out_file_name)
        
        # Save CSV with proper encoding and quoting to handle special characters
        df_out.to_csv(out_full_path, index=False, encoding="utf-8", lineterminator='\n', quoting=csv.QUOTE_ALL)
        
        print(f"[SUCCESS] Bluedart CSV created at: {out_full_path}")
        
        # Validate the generated file
        if os.path.exists(out_full_path):
            file_size = os.path.getsize(out_full_path)
            print(f"[INFO] File size: {file_size} bytes")
            
            # Read first few lines to validate
            with open(out_full_path, 'r', encoding='utf-8') as f:
                first_lines = [f.readline().strip() for _ in range(3)]
                print(f"[INFO] First 3 lines:")
                for i, line in enumerate(first_lines, 1):
                    print(f"  Line {i}: {line[:100]}...")
        else:
            raise FileNotFoundError(f"Generated file not found: {out_full_path}")
        
        # ====== SAVE UPDATED COUNTER ======
        with open(counter_file, "w", encoding="utf-8") as f:
            f.write(str(current_ref_no))
        
        print(f"[INFO] New last used reference number stored: {current_ref_no:03d}")
        
        return {
            'success': True,
            'message': f'Generated BlueDart file with {len(rows_out)} records successfully',
            'file': out_full_path,
            'filename': out_file_name,
            'count': len(rows_out)
        }
        
    except Exception as e:
        error_msg = f"Error generating BlueDart file: {str(e)}"
        print(f"[ERROR] {error_msg}")
        return {
            'success': False,
            'message': error_msg,
            'file': None,
            'filename': None,
            'count': 0
        }

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) != 4:
        print("Usage: python generate_bluedart.py <csv_file> <output_dir> <counter_dir>")
        print("Example: python generate_bluedart.py data.csv output/ counter/")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    output_dir = sys.argv[2]
    counter_dir = sys.argv[3]
    
    print("[START] Starting BlueDart Generation...")
    print(f"[CSV] CSV file: {csv_file}")
    print(f"[OUTPUT] Output directory: {output_dir}")
    print(f"[COUNTER] Counter directory: {counter_dir}")
    
    # Validate input file exists
    if not os.path.exists(csv_file):
        print(f"[ERROR] CSV file not found: {csv_file}")
        sys.exit(1)
    
    # Generate BlueDart file
    result = generate_bluedart_file(csv_file, output_dir, counter_dir)
    
    # Output result as JSON for Node.js to parse
    print("RESULT_JSON:", json.dumps(result))
    
    if result['success']:
        print("[COMPLETE] BlueDart generation completed successfully!")
        sys.exit(0)
    else:
        print("[FAILED] BlueDart generation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()