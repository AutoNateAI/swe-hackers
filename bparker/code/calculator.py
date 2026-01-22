"""Simple Calculator"""
import sys

# Get inputs (from command line or prompts)
if len(sys.argv) == 4:
    num1 = float(sys.argv[1])
    num2 = float(sys.argv[2])
    operator = sys.argv[3]
else:
    num1 = float(input("Enter first number: "))
    num2 = float(input("Enter second number: "))
    operator = input("Enter operator (+, -, *, /): ")

# Calculate based on operator
if operator == "+":
    result = num1 + num2
elif operator == "-":
    result = num1 - num2
elif operator == "*":
    result = num1 * num2
elif operator == "/":
    if num2 == 0:
        print("Error: Cannot divide by zero")
        exit()
    result = num1 / num2
else:
    print(f"Error: Unknown operator '{operator}'")
    exit()

# Print result
print(f"{num1} {operator} {num2} = {result}")
